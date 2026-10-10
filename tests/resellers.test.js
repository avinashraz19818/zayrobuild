'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Database=require('better-sqlite3'),crypto=require('crypto');
const rs=require('../utils/resellers'),apk=require('../utils/apk-payment-reservation');
const {createService,defaults}=require('../utils/welcome-deploy');
const {createStore}=require('../utils/site-store');
function fixture(t){const db=new Database(':memory:');t.after(()=>db.close());db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,telegram_id TEXT,coins REAL);INSERT INTO users VALUES(1,'alice','11111',10000),(2,'bob','22222',10000);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE orders(id INTEGER PRIMARY KEY,user_id INTEGER,coins_spent REAL,status TEXT,build_log TEXT);`);apk.schema(db);return db;}
const enable=(db,id=1,extra={})=>rs.save(db,id,{status:'active',apk_percent:30,bot_percent:25,site_percent:20,note:'private note',version:rs.profile(db,id)?.version||0,...extra},'test-admin');
test('exact 30/35 percent prices, non-reseller unaffected and coupon stacking rejected',t=>{
 const db=fixture(t);enable(db,1,{apk_percent:35});
 for(const [retail,total] of [[999,649.35],[299,194.35],[1298,843.7]])assert.equal(rs.pricing(db,1,'apk',retail).total,total);
 assert.equal(rs.pricing(db,1,'bot',999).total,749.25);assert.equal(rs.pricing(db,1,'site',1199).total,959.2);
 assert.equal(rs.pricing(db,2,'apk',999).total,999);assert.throws(()=>rs.pricing(db,1,'bot',999,'SAVE'),/cannot be combined/);
});
test('discount validation, admin audit, stale writes, suspend/disable and immutable historical rates',t=>{
 const db=fixture(t),p=enable(db);const q=rs.pricing(db,1,'apk',999);rs.record(db,1,'apk',1,'App',q);
 assert.throws(()=>rs.save(db,1,{...p,apk_percent:100},'admin'),/0 to 95/);
 assert.throws(()=>rs.save(db,1,{...p,bot_percent:''},'admin'),/whole percentages/);
 assert.throws(()=>rs.save(db,9,{...p},'admin'),/not found/);
 enable(db,1,{apk_percent:35});assert.throws(()=>rs.save(db,1,p,'admin'),/updated elsewhere/);
 assert.equal(db.prepare('SELECT paid_paise FROM reseller_sales').get().paid_paise,69930);
 enable(db,1,{status:'suspended'});assert.throws(()=>rs.pricing(db,1,'apk',999),/suspended/);
 enable(db,1,{status:'disabled'});assert.equal(rs.pricing(db,1,'apk',999).total,999);
 assert.equal(db.prepare('SELECT count(*) n FROM reseller_audit').get().n,4);
});
test('APK reserve/debit/order/ledger/idempotency are atomic; refunds exactly once with original rate',t=>{
 const db=fixture(t);enable(db,1,{apk_percent:35});const q=rs.pricing(db,1,'apk',1298);
 const input={userId:1,key:crypto.randomUUID(),total:q.total,quote:q,label:'Both APKs',insert:()=>db.prepare("INSERT INTO orders(user_id,coins_spent,status) VALUES(?,?,'building')").run(1,q.total).lastInsertRowid};
 const one=apk.reserve(db,input),two=apk.reserve(db,input);assert.equal(one.orderId,two.orderId);assert.equal(two.replayed,true);
 assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,9156.3);assert.equal(db.prepare('SELECT count(*) n FROM reseller_sales').get().n,1);
 enable(db,1,{apk_percent:40});assert.equal(apk.refund(db,one.orderId,'failed'),true);assert.equal(apk.refund(db,one.orderId,'failed'),false);
 assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,10000);assert.equal(db.prepare('SELECT amount_paise FROM reseller_refunds').get().amount_paise,84370);
 assert.throws(()=>apk.reserve(db,{...input,key:crypto.randomUUID(),insert:()=>{throw Error('insert failure');}}),/insert failure/);assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,10000);
 assert.throws(()=>apk.reserve(db,{...input,key:''}),/Reload/);
});
test('Bot reseller quote, duplicate requests, suspension during verification and exact refunds',async t=>{
 const db=fixture(t);enable(db);let duringVerify=null;
 const bridge=async path=>{if(path==='/health')return {ready:true};if(path==='/verify'){duringVerify?.();return {id:'12345678',name:'Bot',username:'example_bot'};}return {status:'failed'};};
 const service=createService(db,bridge,'a'.repeat(64));service.setting('welcome_enabled','1');service.setting('welcome_plans',JSON.stringify([{...defaults[0],price:999,renewal_price:999,enabled:true}]));
 const body={plan_key:'days30',request_key:crypto.randomUUID(),bot_token:'12345678:'+'x'.repeat(25),admin_tg_id:'12345678',expected_coins:749.25};
 const first=await service.purchase(1,body);assert.equal(first.coins,749.25);assert.equal((await service.purchase(1,body)).id,first.id);assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,9250.75);
 service.settle(first.id,{status:'failed'});service.settle(first.id,{status:'failed'});assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,10000);assert.equal(db.prepare('SELECT count(*) n FROM reseller_refunds').get().n,1);
 duringVerify=()=>enable(db,1,{status:'suspended'});await assert.rejects(service.purchase(1,{...body,request_key:crypto.randomUUID()}),/suspended/);assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,10000);
});
test('Website quantities, renewals, stale discount and coupon validation without stock/money loss',t=>{
 const db=fixture(t);enable(db);const store=createStore(db,crypto.randomBytes(32));
 const product=store.saveProduct({name:'Site',url:'https://example.test',enabled:true,plans:[{key:'month',days:30,price:1199}]});for(const username of ['a','b','c'])store.addStock(product,{username,password:'long-password'});
 const body={product_id:product,plan_key:'month',quantity:2,request_key:crypto.randomUUID()};const q=store.quote(1,body);assert.equal(q.total,1918.4);
 assert.throws(()=>store.quote(1,{...body,coupon:'SAVE'}),/cannot be combined/);
 const bought=store.purchase(1,{...body,expected_total:q.total,expected_same_account:false});assert.equal(store.purchase(1,body).id,bought.id);assert.equal(store.products()[0].stock,1);
 const renewal={...body,quantity:1,renew_id:bought.lease_ids[0],request_key:crypto.randomUUID()};const rq=store.quote(1,renewal);assert.equal(rq.total,959.2);assert.equal(rq.same_account,true);
 enable(db,1,{site_percent:25});assert.throws(()=>store.purchase(1,{...renewal,expected_total:rq.total,expected_same_account:true}),/changed/);assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,8081.6);
 const next=store.quote(1,renewal);store.purchase(1,{...renewal,expected_total:next.total,expected_same_account:true});assert.equal(db.prepare('SELECT count(*) n FROM reseller_sales').get().n,2);
});
test('reports isolate owners, keep IST boundaries, attribute refunds by refund day and validate date ranges',t=>{
 const db=fixture(t);enable(db);enable(db,2);rs.record(db,1,'apk',1,'One',rs.pricing(db,1,'apk',999));rs.record(db,2,'apk',2,'Two',rs.pricing(db,2,'apk',999));
 db.exec("UPDATE reseller_sales SET created_at='2026-10-08 18:31:00';");rs.refund(db,'apk',1);db.exec("UPDATE reseller_refunds SET created_at='2026-10-09 18:31:00'");
 let r=rs.report(db,1,'2026-10-09','2026-10-09');assert.equal(r.orders.length,1);assert.equal(r.orders[0].user_id,1);assert.equal(r.daily[0].day,'2026-10-09');assert.equal(r.daily[0].refunds_paise,0);assert.equal(r.period.refunds_paise,69930);assert.equal(r.lifetime.potential_margin_paise,0);
 r=rs.report(db,1,'2026-10-10','2026-10-10');assert.equal(r.daily[0].refunds_paise,69930);assert.equal(r.daily[0].orders,0);assert.equal(r.orders.length,0);
 assert.equal(rs.report(db,null,'2026-10-09','2026-10-10').lifetime.orders,2);assert.throws(()=>rs.dates('2026-02-30','2026-03-01'),/valid date/);assert.throws(()=>rs.dates('2020-01-01','2026-01-01'),/366/);
});
test('admin wallet adjustment supports fractional balances after reseller purchases',t=>{
 const db=fixture(t);db.exec('UPDATE users SET coins=9156.3 WHERE id=1');const manager=require('../utils/admin-management').createAdminManagement(db);assert.equal(manager.adjustCoins(1,'add',100).coins,9256.3);assert.equal(manager.adjustCoins(1,'subtract',100).coins,9156.3);enable(db);assert.throws(()=>manager.deleteUsers([1]),/Reseller accounts/);
});
test('remove is audited, version-safe and reversible without deleting wallet, history or discounts snapshot',t=>{
 const db=fixture(t);const p=enable(db);const q=rs.pricing(db,1,'apk',999);rs.record(db,1,'apk',55,'Old purchase',q);
 assert.throws(()=>rs.remove(db,1,p.version-1,'admin'),/updated elsewhere/);
 const removed=rs.remove(db,1,p.version,'admin');assert.equal(removed.status,'disabled');assert.ok(removed.removed_at);assert.equal(removed.version,p.version+1);
 assert.equal(rs.pricing(db,1,'apk',999).total,999);assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins,10000);assert.equal(db.prepare('SELECT paid_paise FROM reseller_sales').get().paid_paise,69930);
 assert.throws(()=>rs.remove(db,1,removed.version,'admin'),/already removed/);
 const restored=enable(db);assert.equal(restored.removed_at,null);assert.equal(rs.pricing(db,1,'apk',999).total,699.3);assert.equal(db.prepare('SELECT count(*) n FROM reseller_audit').get().n,3);
});
test('activity separates actual APK files, deployments, renewals and site quantities; today uses IST purchase date',t=>{
 const db=fixture(t);enable(db);enable(db,2);
 db.exec(`ALTER TABLE orders ADD COLUMN design_variant TEXT;ALTER TABLE orders ADD COLUMN apk_file TEXT;ALTER TABLE orders ADD COLUMN fake_apk_file TEXT;
 CREATE TABLE welcome_orders(id INTEGER PRIMARY KEY,kind TEXT,status TEXT,refunded INTEGER);
 CREATE TABLE site_sales(id INTEGER PRIMARY KEY,kind TEXT,lease_ids TEXT);
 INSERT INTO orders(id,status,design_variant,apk_file,fake_apk_file) VALUES(1,'done','both','real.apk','fake.apk'),(2,'done','fake','fake-only.apk',NULL),(3,'building','both',NULL,NULL),(4,'failed','real',NULL,NULL),(5,'done','both','real.apk',NULL),(6,'done','real','refunded.apk',NULL),(7,'done','real','other-user.apk',NULL);
 INSERT INTO welcome_orders VALUES(1,'deploy','active',0),(2,'renew','active',0),(3,'deploy','provisioning',0),(4,'deploy','failed',1);
 INSERT INTO site_sales VALUES(1,'purchase','[10,11,12]'),(2,'renew','[10]'),(3,'purchase','invalid-json');`);
 for(const id of [1,2,3,4,5,6])rs.record(db,1,'apk',id,'APK',rs.pricing(db,1,'apk',999));rs.record(db,2,'apk',7,'Other',rs.pricing(db,2,'apk',999));
 for(const id of [1,2,3,4])rs.record(db,1,'bot',id,'Bot',rs.pricing(db,1,'bot',999));
 for(const id of [1,2,3])rs.record(db,1,'site',id,'Site',rs.pricing(db,1,'site',999));
 rs.refund(db,'apk',6);rs.refund(db,'bot',4);
 db.exec("UPDATE reseller_sales SET created_at='2026-10-08 18:31:00';UPDATE reseller_sales SET created_at='2026-10-08 18:29:00' WHERE service='apk' AND order_id=2;");
 const activity=require('../utils/reseller-activity')(db,1,{from:'2026-10-08',to:'2026-10-08'},'2026-10-09');
 assert.equal(activity.lifetime.real_apks,2);assert.equal(activity.lifetime.fake_apks,2);assert.equal(activity.today.fake_apks,1);assert.equal(activity.period.fake_apks,1);
 assert.equal(activity.lifetime.apk_orders,6);assert.equal(activity.lifetime.apk_pending,1);assert.equal(activity.lifetime.apk_failed,1);assert.equal(activity.lifetime.apk_refunded,1);
 assert.equal(activity.lifetime.bots,1);assert.equal(activity.lifetime.bot_renewals,1);assert.equal(activity.lifetime.bot_pending,1);assert.equal(activity.lifetime.bot_refunded,1);
 assert.equal(activity.lifetime.site_accounts,3);assert.equal(activity.lifetime.site_renewals,1);assert.equal(activity.lifetime.site_orders,3);
});
