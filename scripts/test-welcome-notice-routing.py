"""Execute actual upstream jobs in an isolated harness; no Telegram/PG imports."""
import ast
import asyncio
from pathlib import Path
from types import SimpleNamespace
source=Path('services/welcome-bot/upstream.py').read_text()
tree=ast.parse(source)
names={'check_expired_subscriptions_job','subscription_reminder_job'}
module=ast.Module(body=[n for n in tree.body if isinstance(n,ast.AsyncFunctionDef) and n.name in names],type_ignores=[])
from datetime import datetime, timezone
sent=[]
class DB:
    def get_expired_subscriptions(self): return ['managed','independent']
    def get_expiring_subscriptions(self,days): return [{'bot_id':b,'subscription_type':'monthly','expiry_date':datetime.now(timezone.utc)} for b in ['managed','independent']]
    def get_user_bot(self,b): return {'user_id':b,'is_active':1}
    def set_user_bot_active(self,b,active): stopped.append(b)
    def mark_reminder_sent(self,b,days): marked.append(b)
async def send(bot,chat,*args,**kwargs): sent.append(chat)
stopped=[];marked=[]
ns=dict(ContextTypes=SimpleNamespace(DEFAULT_TYPE=object),db=DB(),subscription_notices_external=lambda b:b=='managed',user_bot_applications={},send_premium_message=send,UIFormatter=SimpleNamespace(subscription_expired=lambda:'expired',expiry_reminder_3d=lambda *a:'3d',expiry_reminder_1d=lambda *a:'1d'),InlineKeyboardMarkup=lambda v:v,btn=lambda *a:a,ADMIN_USERNAME='admin',ParseMode=SimpleNamespace(HTML='HTML'),_cleanup_support_maps=lambda:None,datetime=datetime,make_aware=lambda d:d,now_aware=lambda:datetime.now(timezone.utc))
exec(compile(module,'upstream-jobs','exec'),ns)
async def main():
    context=SimpleNamespace(bot='manager')
    await ns['subscription_reminder_job'](context)
    assert sent==['independent','independent'] and marked==['independent','independent']
    sent.clear()
    await ns['check_expired_subscriptions_job'](context)
    assert stopped==['managed','independent'] and sent==['independent']
asyncio.run(main())
assert 'if subscription_notices_external(bot_id):' in source[source.index('if data == "admin_send_reminders":'):]
print('PASS: managed reminder/expiry delivery suppressed; expiry stop enforcement and independent-bot notices preserved.')
