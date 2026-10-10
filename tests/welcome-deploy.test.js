'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createService, validatePlans, defaults } = require('../utils/welcome-deploy');
function fixture(t) {
  const db = new Database(':memory:'); t.after(()=>db.close());
  db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY, coins INTEGER, username TEXT); CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); INSERT INTO users VALUES(1,10000,\'one\'),(2,0,\'two\');');
  let result={status:'active',remote_id:'remote1',expires_at:'2027-01-01T00:00:00Z'}, calls=[];
  const bridge=async(path,body)=>{ calls.push({path,body});if(path==='/verify')return {id:'123456789',name:'Welcome',username:'welcome_test_bot'};if(path==='/health')return {ready:true};if(path==='/fleet')return {bots:[]};if(result instanceof Error)throw result;return result; };
  const service=createService(db,bridge,'a'.repeat(64));
  service.setting('welcome_enabled','1');service.setting('welcome_plans',JSON.stringify([{...defaults[0],price:1000,renewal_price:500,enabled:true}]));
  const body={request_key:'a'.repeat(32),bot_token:'123456789:'+'b'.repeat(30),admin_tg_id:'12345678',plan_key:'days30',expected_coins:1000};
  return {db,service,body,calls,setResult:r=>result=r,balance:()=>db.prepare('SELECT coins FROM users WHERE id=1').get().coins};
}
test('plans reject invalid prices/duplicate keys; defaults are unpublished',()=>{
  assert.ok(defaults.every(p=>!p.enabled));
  assert.throws(()=>validatePlans([{...defaults[0],enabled:true}]));
  assert.throws(()=>validatePlans([defaults[0],defaults[0]]));
});
test('purchase charges once, encrypts token, and excludes all credentials from responses',async t=>{
  const f=fixture(t),one=await f.service.purchase(1,f.body),two=await f.service.purchase(1,f.body);
  assert.equal(one.id,two.id);assert.equal(f.balance(),9000);
  const row=f.db.prepare('SELECT * FROM welcome_orders').get();
  assert.ok(row.token_cipher);assert.ok(!row.token_cipher.includes(f.body.bot_token));
  assert.ok(!JSON.stringify(one).includes('token'));assert.ok(!JSON.stringify(one).includes('operation_key'));
  await f.service.tick();assert.equal(f.db.prepare('SELECT status FROM welcome_orders').get().status,'active');
  assert.equal(f.db.prepare('SELECT token_cipher FROM welcome_orders').get().token_cipher,'');
});
test('parallel duplicate purchase is atomically charged once',async t=>{
  const f=fixture(t);await Promise.all([f.service.purchase(1,f.body),f.service.purchase(1,f.body)]);assert.equal(f.balance(),9000);
});
test('server rejects insufficient wallet, stale price and unknown plan without debits',async t=>{
  const f=fixture(t);
  await assert.rejects(f.service.purchase(2,f.body),/Not enough/);
  await assert.rejects(f.service.purchase(1,{...f.body,expected_coins:1}),/Price changed/);
  await assert.rejects(f.service.purchase(1,{...f.body,plan_key:'tampered'}),/not available/);
  assert.equal(f.balance(),10000);
});
test('confirmed failure refunds once and clears secrets',async t=>{
  const f=fixture(t);const row=await f.service.purchase(1,f.body);f.setResult({status:'failed'});await f.service.tick();f.service.settle(row.id,{status:'failed'});assert.equal(f.balance(),10000);assert.equal(f.db.prepare('SELECT refunded FROM welcome_orders').get().refunded,1);
});
test('ambiguous bridge failure stays pending and retries SAME operation without refund',async t=>{
  const f=fixture(t);await f.service.purchase(1,f.body);f.setResult(new Error('timeout'));await f.service.tick();assert.equal(f.balance(),9000);
  f.setResult({status:'active',remote_id:'remote1',expires_at:'2027-01-01T00:00:00Z'});await f.service.tick();
  const calls=f.calls.filter(x=>x.path==='/deploy');assert.equal(calls[0].body.operation_key,calls[1].body.operation_key);assert.equal(f.balance(),9000);
});
test('coupon, per-customer use and direct INR pricing ignore legacy exchange rates',async t=>{
  const f=fixture(t);f.service.setting('coin_rate','2');
  f.db.prepare('INSERT INTO welcome_coupons VALUES(?,?,?,?,?)').run('SAVE',20,10,'2099-01-01T00:00:00Z',1);
  const q=f.service.quote(1,{...f.body,coupon:'SAVE'});assert.equal(q.coins,800);assert.equal(q.total,800);
  await f.service.purchase(1,{...f.body,coupon:'SAVE',expected_coins:800});
  assert.throws(()=>f.service.quote(1,{...f.body,coupon:'SAVE'}),/already used/);
});
test('duplicate bot blocked; renewal requires ownership, uses renewal price and updates parent',async t=>{
  const f=fixture(t),parent=await f.service.purchase(1,f.body);await f.service.tick();
  await assert.rejects(f.service.purchase(1,{...f.body,request_key:'b'.repeat(32)}),/already has/);
  assert.throws(()=>f.service.quote(2,{...f.body,renew_id:parent.id}),/not available/);
  const renewal=await f.service.purchase(1,{...f.body,request_key:'c'.repeat(32),renew_id:parent.id,expected_coins:500});
  assert.equal(renewal.kind,'renew');assert.equal(f.balance(),8500);await f.service.tick();
  assert.equal(f.calls.filter(x=>x.path==='/deploy').at(-1).body.remote_id,'remote1');
});
test('pending purchase survives service restart and missing encryption key rolls debit back',async t=>{
  const f=fixture(t);await f.service.purchase(1,f.body);
  let received;
  const restarted=createService(f.db,async(route,payload)=>{if(route==='/fleet')return {bots:[]};received=payload;return {status:'active',remote_id:'after-restart',expires_at:'2027-01-01T00:00:00Z'};},'a'.repeat(64));
  await restarted.tick();assert.equal(received.token,f.body.bot_token);assert.equal(f.balance(),9000);
  const g=fixture(t),unconfigured=createService(g.db,async route=>route==='/health'?{ready:true}:{id:'123456789',name:'Test',username:'test_bot'},'');
  await assert.rejects(unconfigured.purchase(1,g.body),/not configured/);assert.equal(g.balance(),10000);
});
test('runtime restart reconciliation updates expiry/status but never erases purchase audit',async t=>{
  const f=fixture(t);await f.service.purchase(1,f.body);await f.service.tick();
  const sync=createService(f.db,async()=>({bots:[{remote_id:'remote1',status:'expired',expires_at:'2020-01-01T00:00:00Z'}]}),'a'.repeat(64));
  await sync.tick();assert.equal(f.db.prepare('SELECT status FROM welcome_orders').get().status,'expired');assert.equal(f.balance(),9000);
});
