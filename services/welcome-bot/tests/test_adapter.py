"""Adapter state-machine tests; no live Telegram credentials or PostgreSQL required."""
import ast
import asyncio
import datetime as dt
import hashlib
import json
from pathlib import Path
import sqlite3
import types
import unittest

class DB:
    def __init__(self):
        self.conn=sqlite3.connect(':memory:')
        self.conn.row_factory=sqlite3.Row
        self.conn.create_function('split_part',3,lambda value,sep,pos:value.split(sep)[pos-1])
        self.conn.executescript('''CREATE TABLE users(user_id INTEGER PRIMARY KEY);
        CREATE TABLE user_bots(bot_id TEXT PRIMARY KEY,user_id INTEGER,bot_token TEXT UNIQUE,bot_username TEXT,is_active INTEGER);
        CREATE TABLE bot_subscriptions(bot_id TEXT,subscription_type TEXT,expiry_date TEXT,max_channels INTEGER);
        CREATE TABLE panel_managed_bots(bot_id TEXT PRIMARY KEY,telegram_id INTEGER UNIQUE,desired TEXT DEFAULT 'active');
        CREATE TABLE panel_operations(operation_key TEXT PRIMARY KEY,kind TEXT,bot_id TEXT,state TEXT DEFAULT 'provisioning',expires_at TEXT,payload_hash TEXT);''')
    def _execute(self,sql,params=()): return self.conn.execute(sql.replace('%s','?'),params)
    def _fetchone(self,sql,params=()):
        r=self._execute(sql,params).fetchone()
        if not r:return None
        r=dict(r)
        for key in ('expiry_date','expires_at'):
            if r.get(key):r[key]=dt.datetime.fromisoformat(r[key])
        return r
    def _fetchall(self,sql,params=()):return [dict(r) for r in self._execute(sql,params).fetchall()]
    def add_user(self,user,*args):self._execute('INSERT OR IGNORE INTO users VALUES(?)',(user,))
    def get_user_bot(self,bot):return self._fetchone('SELECT * FROM user_bots WHERE bot_id=?',(bot,))
    def get_subscription_for_bot(self,bot):return self._fetchone('SELECT * FROM bot_subscriptions WHERE bot_id=? ORDER BY expiry_date DESC LIMIT 1',(bot,))
    def has_active_subscription(self,bot):
        sub=self.get_subscription_for_bot(bot)
        return bool(sub and sub['expiry_date']>dt.datetime.now(dt.timezone.utc))
    def set_user_bot_active(self,bot,value):self._execute('UPDATE user_bots SET is_active=? WHERE bot_id=?',(int(value),bot))
    def remove_user_bot(self,bot):
        for table in ('user_bots','panel_managed_bots','bot_subscriptions'):self._execute(f'DELETE FROM {table} WHERE bot_id=?',(bot,))
class Request:
    def __init__(self,data):self.data=data
    async def json(self):return self.data
class InvalidToken(Exception):pass
class Forbidden(Exception):pass

class AdapterTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db=DB();self.running={};self.start_result=True;self.starts=0
        self.engine=types.SimpleNamespace(db=self.db,now_aware=lambda:dt.datetime.now(dt.timezone.utc),timedelta=dt.timedelta,user_bot_applications=self.running,is_account_running=lambda b:b in self.running)
        async def original_start(token,bot,owner,quiet=False):
            self.starts+=1
            if isinstance(self.start_result,Exception):raise self.start_result
            if self.start_result:self.running[bot]=types.SimpleNamespace(updater=None,running=False,shutdown=self.shutdown)
            return self.start_result
        async def verify(token):return {'id':'123456789','name':'Example','username':'example_bot'}
        self.ns={'asyncio':asyncio,'engine':self.engine,'hashlib':hashlib,'json':json,'lock':asyncio.Lock(),'bot_locks':{},'original_start':original_start,'web':types.SimpleNamespace(json_response=lambda x,**kw:x),'InvalidToken':InvalidToken,'Forbidden':Forbidden}
        source=ast.parse((Path(__file__).parents[1]/'runner.py').read_text())
        names={'managed','state','start_bot','stop_bot','start_bot_unlocked','stop_bot_unlocked','operation_result','deploy'}
        ast_module=ast.Module(body=[n for n in source.body if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name in names],type_ignores=[])
        exec(compile(ast_module,'adapter','exec'),self.ns)
        self.ns['verify_token']=verify
        self.data={'operation_key':'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','kind':'deploy','owner_id':'12345678','token':'123456789:synthetic-token','plan':{'name':'30 days','days':30,'max_channels':5}}
    async def shutdown(self):pass
    def tearDown(self):self.db.conn.close()
    async def deploy(self,data=None):return await self.ns['deploy'](Request(data or self.data))
    async def test_repeated_operation_does_not_duplicate_subscription_or_start(self):
        a=await self.deploy();b=await self.deploy()
        self.assertEqual(a,b);self.assertEqual(a['status'],'active');self.assertEqual(self.starts,1)
        self.assertEqual(self.db._fetchone('SELECT count(*) n FROM bot_subscriptions')['n'],1)
    async def test_operation_survives_ambiguous_start_interruption(self):
        self.start_result=RuntimeError('temporary failure')
        with self.assertRaises(RuntimeError):await self.deploy()
        self.start_result=True
        result=await self.deploy();self.assertEqual(result['status'],'active')
        self.assertEqual(self.db._fetchone('SELECT count(*) n FROM bot_subscriptions')['n'],1)
    async def test_confirmed_start_failure_is_tombstoned_and_not_retried(self):
        self.start_result=False
        self.assertEqual((await self.deploy())['status'],'failed')
        self.start_result=True
        self.assertEqual((await self.deploy())['status'],'failed');self.assertEqual(self.starts,1)
        self.assertEqual(self.db._fetchone('SELECT count(*) n FROM user_bots')['n'],0)
    async def test_duplicate_token_rejected_without_modifying_owner(self):
        await self.deploy();data={**self.data,'operation_key':'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','owner_id':'87654321'}
        self.assertEqual((await self.deploy(data))['status'],'failed')
        self.assertEqual(self.db._fetchone('SELECT user_id FROM user_bots')['user_id'],12345678)
    async def test_renewal_stacks_validity_once_and_checks_owner(self):
        original=await self.deploy()
        data={**self.data,'operation_key':'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','kind':'renew','remote_id':original['remote_id']}
        renewal=await self.deploy(data);again=await self.deploy(data)
        self.assertEqual(renewal,again)
        self.assertEqual(dt.datetime.fromisoformat(renewal['expires_at'])-dt.datetime.fromisoformat(original['expires_at']),dt.timedelta(days=30))
        data={**data,'operation_key':'cccccccc-cccc-4ccc-cccc-cccccccccccc','owner_id':'87654321'}
        self.assertEqual((await self.deploy(data))['status'],'failed')
    async def test_failed_renewal_keeps_previous_subscription(self):
        original=await self.deploy();await self.ns['stop_bot'](original['remote_id']);self.start_result=False
        data={**self.data,'operation_key':'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','kind':'renew','remote_id':original['remote_id']}
        self.assertEqual((await self.deploy(data))['status'],'failed')
        sub=self.db.get_subscription_for_bot(original['remote_id'])
        self.assertEqual(sub['expiry_date'].isoformat(),original['expires_at'])
    async def test_reused_operation_key_with_changed_payload_is_rejected(self):
        await self.deploy()
        with self.assertRaises(ValueError):await self.deploy({**self.data,'owner_id':'87654321'})
    async def test_manual_stop_persists_and_expired_subscription_cannot_start(self):
        result=await self.deploy();bot=result['remote_id'];await self.ns['stop_bot'](bot)
        self.assertEqual(self.ns['managed'](bot)['desired'],'stopped')
        self.db._execute('UPDATE bot_subscriptions SET expiry_date=?',('2000-01-01T00:00:00+00:00',))
        self.assertFalse(await self.ns['start_bot']('token',bot,12345678));self.assertEqual(self.starts,1)

if __name__=='__main__':unittest.main()
