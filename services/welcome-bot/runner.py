"""Loopback-only authenticated adapter for the pinned advanced bot engine.
One runtime / one PostgreSQL database. Never execute upstream's global-kill start script.
"""
import asyncio
import hashlib
import hmac
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'runtime' / 'welcome.env'
if CONFIG.exists():
    for line in CONFIG.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
SECRET = os.getenv('WELCOME_BRIDGE_KEY', '') or (ROOT / 'runtime' / 'welcome-bridge.key').read_text().strip()
if len(SECRET) < 32 or not os.getenv('MAIN_BOT_TOKEN') or not os.getenv('DATABASE_URL'):
    raise SystemExit('Configure Welcome Bot runtime before starting.')
ADMINS = {int(v) for v in os.getenv('ADMIN_USER_IDS', '').split(',') if v.strip().isdigit()}
if not ADMINS:
    raise SystemExit('ADMIN_USER_IDS must contain the operator Telegram ID.')

from aiohttp import web
import upstream as engine
from telegram import Bot
from telegram.error import InvalidToken, Forbidden

# Replace the upstream hardcoded operator, never grant the customer global admin.
engine.ADMIN_USER_IDS = ADMINS
engine.ADMIN_USER_ID = min(ADMINS)
engine.ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', '').lstrip('@')
engine.install_log_masking()
if not engine.db._fetchone('SELECT pg_try_advisory_lock(64948823) AS acquired')['acquired']:
    raise SystemExit('Another Welcome Bot runtime already owns this database.')
engine.db._execute('''CREATE TABLE IF NOT EXISTS panel_operations (
    operation_key TEXT PRIMARY KEY, kind TEXT NOT NULL, bot_id TEXT,
    state TEXT NOT NULL DEFAULT 'provisioning', expires_at TIMESTAMPTZ, payload_hash TEXT NOT NULL)''')
engine.db._execute('''CREATE TABLE IF NOT EXISTS panel_managed_bots (
    bot_id TEXT PRIMARY KEY REFERENCES user_bots(bot_id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE NOT NULL, desired TEXT NOT NULL DEFAULT 'active')''')
lock = asyncio.Lock()
bot_locks = {}
manager = None
manager_task = None


def managed(bot_id):
    return engine.db._fetchone('SELECT * FROM panel_managed_bots WHERE bot_id=%s', (bot_id,))


# Keep manager delivery for independent subscriptions; panel-owned subscriptions
# use the builder notifier. Applies to scheduled and manual reminder paths.
engine.subscription_notices_external = lambda bot_id: bool(managed(bot_id))

def state(bot_id):
    bot = engine.db.get_user_bot(bot_id)
    if not bot:
        return {'remote_id': bot_id, 'status': 'stopped', 'expires_at': None}
    sub = engine.db.get_subscription_for_bot(bot_id)
    expiry = sub.get('expiry_date') if sub else None
    status = 'expired' if not expiry or expiry <= engine.now_aware() else 'active' if engine.is_account_running(bot_id) else 'stopped'
    return {'remote_id': bot_id, 'status': status, 'expires_at': expiry.isoformat() if expiry else None,
            'legacy_reminders': {'3d': bool(sub and sub.get('reminder_3d_sent')), '1d': bool(sub and sub.get('reminder_1d_sent'))}}


original_start, original_stop = engine.start_user_bot, engine.stop_user_bot
async def start_bot_unlocked(token, bot_id, owner_id, quiet=False):
    if managed(bot_id) and not engine.db.has_active_subscription(bot_id):
        return False
    if engine.is_account_running(bot_id):
        return True
    result = await original_start(token, bot_id, owner_id, quiet=quiet)
    if result:
        engine.db.set_user_bot_active(bot_id, True)
        engine.db._execute("UPDATE panel_managed_bots SET desired='active' WHERE bot_id=%s", (bot_id,))
    return result


async def stop_bot_unlocked(bot_id):
    app = engine.user_bot_applications.get(bot_id)
    if app:
        if app.updater and app.updater.running:
            await app.updater.stop()
        if app.running:
            await app.stop()
        await app.shutdown()
        engine.user_bot_applications.pop(bot_id, None)
    engine.db.set_user_bot_active(bot_id, False)
    engine.db._execute("UPDATE panel_managed_bots SET desired='stopped' WHERE bot_id=%s", (bot_id,))


async def start_bot(token, bot_id, owner_id, quiet=False):
    async with bot_locks.setdefault(bot_id, asyncio.Lock()):
        return await start_bot_unlocked(token, bot_id, owner_id, quiet)


async def stop_bot(bot_id):
    async with bot_locks.setdefault(bot_id, asyncio.Lock()):
        await stop_bot_unlocked(bot_id)


engine.start_user_bot, engine.stop_user_bot = start_bot, stop_bot
original_grant = engine.db.grant_broadcast_subscription
engine.db.grant_broadcast_subscription = lambda bot_id, days=1, sub_type='Basic': False if managed(bot_id) else original_grant(bot_id, days, sub_type)


async def recover_unlocked(context=None):
    for bot in engine.db.get_all_user_bots():
        m = managed(bot['bot_id'])
        if (m and m['desired'] != 'active') or (not m and not bot['is_active']):
            continue
        if engine.db.has_active_subscription(bot['bot_id']) and not engine.is_account_running(bot['bot_id']):
            await start_bot(bot['bot_token'], bot['bot_id'], bot['user_id'], quiet=True)
async def recover(context=None):
    async with lock:
        await recover_unlocked(context)

engine.start_bots_on_boot = recover
engine.retry_inactive_userbots_job = recover


async def verify_token(token):
    if token == engine.MAIN_BOT_TOKEN:
        raise ValueError('bot_in_use')
    async with Bot(token) as bot:
        info = await bot.get_me()
        webhook = await bot.get_webhook_info()
        if webhook.url:
            raise ValueError('bot_in_use')
        return {'id': str(info.id), 'name': info.first_name, 'username': info.username}


@web.middleware
async def authenticate(request, handler):
    if not hmac.compare_digest(request.headers.get('Authorization', ''), 'Bearer ' + SECRET):
        return web.json_response({'code': 'unauthorized'}, status=401)
    try:
        return await handler(request)
    except (InvalidToken, Forbidden):
        return web.json_response({'code': 'invalid_token'}, status=400)
    except ValueError as exc:
        return web.json_response({'code': str(exc) if str(exc) in ('bot_in_use','invalid_token') else 'invalid_request'}, status=400)
    except Exception:
        # Never return/log request bodies, tokens, connection URLs or exception text.
        return web.json_response({'code': 'unavailable'}, status=503)


async def health(request):
    engine.db._fetchone('SELECT 1')
    return web.json_response({'ready': bool(manager and manager_task and not manager_task.done()), 'manager_username': manager.username if manager else '', 'build': '331a88b-panel1'})


async def verify(request):
    data = await request.json()
    return web.json_response(await verify_token(str(data.get('token', ''))))


def operation_result(op):
    return {'status': op['state'], 'remote_id': op['bot_id'], 'expires_at': op['expires_at'].isoformat() if op['expires_at'] else None}


async def deploy(request):
    data = await request.json()
    key = str(data.get('operation_key', ''))
    import uuid
    uuid.UUID(key)
    digest = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
    async with lock:
        op = engine.db._fetchone('SELECT * FROM panel_operations WHERE operation_key=%s', (key,))
        if op and op['payload_hash'] != digest:
            raise ValueError('invalid_request')
        if op and op['state'] in ('active', 'failed'):
            return web.json_response(operation_result(op))
        kind = data.get('kind')
        plan = data['plan']
        days, channels = int(plan['days']), int(plan['max_channels'])
        owner = int(data['owner_id'])
        if kind not in ('deploy','renew') or not (1 <= days <= 3650 and 1 <= channels <= 1000 and owner > 0):
            raise ValueError('invalid_request')
        if not op:
            if kind == 'deploy':
                try:
                    info = await verify_token(data['token'])
                    existing = engine.db._fetchone("SELECT bot_id FROM user_bots WHERE split_part(bot_token,':',1)=%s", (info['id'],))
                    if existing:
                        raise ValueError('bot_in_use')
                except (InvalidToken, Forbidden, ValueError):
                    engine.db._execute("INSERT INTO panel_operations(operation_key,kind,state,payload_hash) VALUES(%s,%s,'failed',%s)", (key,kind,digest))
                    return web.json_response({'status':'failed'})
                bot_id = f"{owner}_{info['id']}"
            else:
                bot_id = str(data.get('remote_id',''))
                existing = engine.db.get_user_bot(bot_id)
                if not managed(bot_id) or not existing or existing['user_id'] != owner:
                    engine.db._execute("INSERT INTO panel_operations(operation_key,kind,state,payload_hash) VALUES(%s,%s,'failed',%s)", (key,kind,digest))
                    return web.json_response({'status':'failed'})
            # No awaits in this PostgreSQL transaction. Remote operation + subscription are atomic.
            with engine.db.conn:
                if kind == 'deploy':
                    engine.db.add_user(owner,None,f'User{owner}',None)
                    engine.db._execute('INSERT INTO user_bots(bot_id,user_id,bot_token,bot_username,is_active) VALUES(%s,%s,%s,%s,0)', (bot_id,owner,data['token'],info['username']))
                    engine.db._execute('INSERT INTO panel_managed_bots(bot_id,telegram_id) VALUES(%s,%s)', (bot_id,int(info['id'])))
                old = engine.db.get_subscription_for_bot(bot_id)
                base = max(engine.now_aware(),old['expiry_date']) if old else engine.now_aware()
                expiry = base + engine.timedelta(days=days)
                engine.db._execute('INSERT INTO bot_subscriptions(bot_id,subscription_type,expiry_date,max_channels) VALUES(%s,%s,%s,%s)', (bot_id,plan['name'],expiry,channels))
                engine.db._execute('INSERT INTO panel_operations(operation_key,kind,bot_id,expires_at,payload_hash) VALUES(%s,%s,%s,%s,%s)', (key,kind,bot_id,expiry,digest))
            op = engine.db._fetchone('SELECT * FROM panel_operations WHERE operation_key=%s',(key,))
        bot_id = op['bot_id']
        bot = engine.db.get_user_bot(bot_id)
        started = await start_bot(bot['bot_token'], bot_id, bot['user_id'])
        if started:
            engine.db.set_user_bot_active(bot_id, True)
            engine.db._execute("UPDATE panel_operations SET state='active' WHERE operation_key=%s",(key,))
            return web.json_response({'status':'active','remote_id':bot_id,'expires_at':op['expires_at'].isoformat()})
        # A failed renewal can coexist with paid old validity; remove only this operation's subscription.
        await stop_bot(bot_id)
        with engine.db.conn:
            engine.db._execute('DELETE FROM bot_subscriptions WHERE bot_id=%s AND expiry_date=%s',(bot_id,op['expires_at']))
            engine.db._execute("UPDATE panel_operations SET state='failed' WHERE operation_key=%s",(key,))
            if kind == 'deploy':
                engine.db.remove_user_bot(bot_id)
        return web.json_response({'status':'failed'})


async def fleet(request):
    bots = engine.db._fetchall('SELECT bot_id FROM panel_managed_bots')
    return web.json_response({'subscription_notice_owner':'builder','bots':[state(b['bot_id']) for b in bots]})


async def action(request):
    data = await request.json()
    bot_id, command = data['remote_id'], data['action']
    async with lock:
        bot = engine.db.get_user_bot(bot_id)
        if not bot or not managed(bot_id):
            raise ValueError('invalid_request')
        if command in ('stop','restart'):
            await stop_bot(bot_id)
        if command in ('start','restart'):
            if not engine.db.has_active_subscription(bot_id):
                raise ValueError('invalid_request')
            if not await start_bot(bot['bot_token'],bot_id,bot['user_id']):
                raise RuntimeError('Start failed')
        result = state(bot_id)
        if command == 'info':
            result.update(channels=[{'id':c['channel_id'],'name':c['channel_title'],'auto_approve':bool(c['auto_approve'])} for c in engine.db.get_bot_channels(bot_id)], total_users=engine.db.get_total_requesters_count(bot_id), reachable_users=engine.db.get_reachable_requesters_count(bot_id))
        return web.json_response(result)


async def controls(request):
    data = await request.json()
    command = data['action']
    async with lock:
        if command == 'summary':
            bots = engine.db.get_all_user_bots()
            return web.json_response({'bots':len(bots),'running':sum(engine.is_account_running(b['bot_id']) for b in bots),'users':len(engine.db.get_all_users()),'subscriptions':len(engine.db.get_all_subscriptions())})
        if command == 'users':
            return web.json_response(engine.db.get_all_users(),dumps=lambda x:json.dumps(x,default=str))
        if command == 'subscriptions':
            return web.json_response(engine.db.get_all_subscriptions(),dumps=lambda x:json.dumps(x,default=str))
        if command in ('start_all','stop_all'):
            done = 0
            for bot in engine.db.get_all_user_bots():
                if command == 'stop_all':
                    await stop_bot(bot['bot_id']); done += 1
                elif engine.db.has_active_subscription(bot['bot_id']):
                    done += int(await start_bot(bot['bot_token'],bot['bot_id'],bot['user_id']))
            return web.json_response({'success':True,'affected':done})
        if command in ('check_expiry','reminders'):
            from types import SimpleNamespace
            async with Bot(engine.MAIN_BOT_TOKEN) as bot:
                context = SimpleNamespace(bot=bot)
                await (engine.check_expired_subscriptions_job(context) if command=='check_expiry' else engine.subscription_reminder_job(context))
            return web.json_response({'success':True})
        if command == 'get_defaults':
            return web.json_response({'first_message':engine.db.get_default_first_message(),'leave_recovery':engine.db.get_leave_recovery_config()})
        if command == 'save_defaults':
            text = str(data.get('first_message','')).strip()
            if not text or len(text)>4000:
                raise ValueError('invalid_request')
            engine.db.set_default_first_message(text)
            return web.json_response({'success':True})
        raise ValueError('invalid_request')


async def enforce_expiry():
    while True:
        await asyncio.sleep(30)
        try:
            async with lock:
                for row in engine.db._fetchall('SELECT bot_id FROM panel_managed_bots'):
                    bot_id = row['bot_id']
                    if engine.is_account_running(bot_id) and not engine.db.has_active_subscription(bot_id):
                        await stop_bot(bot_id)
        except Exception:
            # Database/runtime recovery requires operator attention; never log secrets.
            engine.logging.warning('Welcome Bot expiry check could not complete; retrying.')


async def main():
    global manager, manager_task
    async with Bot(engine.MAIN_BOT_TOKEN) as bot:
        manager = await bot.get_me()
    manager_task = asyncio.create_task(engine.main())
    expiry_task = asyncio.create_task(enforce_expiry())
    app = web.Application(middlewares=[authenticate],client_max_size=32768)
    for route, handler in [('/health',health),('/verify',verify),('/deploy',deploy),('/fleet',fleet),('/action',action),('/controls',controls)]:
        app.router.add_post(route,handler)
    runner = web.AppRunner(app,access_log=None)
    await runner.setup()
    await web.TCPSite(runner,'127.0.0.1',int(os.getenv('WELCOME_BRIDGE_PORT','8787'))).start()
    try:
        await manager_task
    finally:
        expiry_task.cancel()
        await runner.cleanup()
        for bot_id in list(engine.user_bot_applications):
            await original_stop(bot_id)

if __name__ == '__main__':
    asyncio.run(main())
