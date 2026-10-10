'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const Database=require('better-sqlite3');
const {enableRupeeWallet}=require('../utils/rupee-wallet');const {customerHistory}=require('../utils/purchase-history');
test('INR mode preserves balances/prices, paid pending deposits, and migration is idempotent',t=>{
 const db=new Database(':memory:');t.after(()=>db.close());
 db.exec(`CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);INSERT INTO settings VALUES('coin_rate','2');
 CREATE TABLE users(coins INTEGER);INSERT INTO users VALUES(999);
 CREATE TABLE designs(price_coins INTEGER);INSERT INTO designs VALUES(100);
 CREATE TABLE coin_requests(status TEXT,coins_requested INTEGER,amount_paid INTEGER);INSERT INTO coin_requests VALUES('pending',100,200),('approved',100,200);`);
 enableRupeeWallet(db);enableRupeeWallet(db);
 assert.equal(db.prepare("SELECT value FROM settings WHERE key='coin_rate'").get().value,'1');
 assert.equal(db.prepare("SELECT value FROM settings WHERE key='wallet_previous_coin_rate'").get().value,'2');
 assert.equal(db.prepare('SELECT coins FROM users').get().coins,999);assert.equal(db.prepare('SELECT price_coins FROM designs').get().price_coins,100);
 assert.equal(db.prepare("SELECT coins_requested FROM coin_requests WHERE status='pending'").get().coins_requested,200);
 assert.equal(db.prepare("SELECT coins_requested FROM coin_requests WHERE status='approved'").get().coins_requested,100);
});
test('combined history is owner-scoped, newest-first, and keeps variants/renewals distinct without tokens or paths',t=>{
 const db=new Database(':memory:');t.after(()=>db.close());
 db.exec(`CREATE TABLE designs(id INTEGER,name TEXT);INSERT INTO designs VALUES(1,'Design');
 CREATE TABLE orders(id INTEGER,user_id INTEGER,design_id INTEGER,app_name TEXT,status TEXT,created_at TEXT,icon_file TEXT,apk_file TEXT,fake_apk_file TEXT,fake_register_url TEXT,coins_spent INTEGER,live_link_enabled INTEGER);
 INSERT INTO orders VALUES(1,1,1,'Mine','done','2026-10-01 01:00:00',null,'secret/path.apk','secret/fake.apk','https://example.test',200,1),(2,2,1,'Other','done','2026-10-08 01:00:00',null,'private.apk',null,null,300,1);
 CREATE TABLE order_fake_sites(id INTEGER,order_id INTEGER,status TEXT,created_at TEXT,apk_file TEXT);
 INSERT INTO order_fake_sites VALUES(1,1,'done','2026-10-02 00:00:00','secret/extra.apk'),(2,2,'done','2026-10-08 00:00:00','private-extra.apk');
 CREATE TABLE welcome_orders(id INTEGER,user_id INTEGER,kind TEXT,parent_id INTEGER,bot_name TEXT,bot_username TEXT,admin_tg_id TEXT,plan_json TEXT,price INTEGER,coins INTEGER,status TEXT,refunded INTEGER,expires_at TEXT,created_at TEXT,token_cipher TEXT);
 INSERT INTO welcome_orders VALUES(1,1,'deploy',null,'Mine','mine_bot','123456','{"name":"30 days"}',999,999,'active',0,null,'2026-10-03T00:00:00Z','SECRET'),(2,1,'renew',1,'Mine','mine_bot','123456','{"name":"30 days"}',500,500,'active',0,null,'2026-10-04T00:00:00Z','SECRET'),(3,2,'deploy',null,'Other','other_bot','999999','{}',100,100,'active',0,null,'2026-10-08T00:00:00Z','SECRET');`);
 const rows=customerHistory(db,1);assert.equal(rows.length,5);assert.equal(rows[0].purchase_type,'renew');assert.equal(new Set(rows.map(r=>r.key)).size,5);
 assert.deepEqual(rows.filter(r=>r.kind==='fake').map(r=>r.source_kind).sort(),['extra','primary']);
 assert.doesNotMatch(JSON.stringify(rows),/SECRET|secret\/|private|Other|token_cipher/);
 assert.equal(customerHistory(db,999).length,0);
});
test('extra variant downloads require the owner and the matching parent order',t=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
 const db=new Database(':memory:');t.after(()=>db.close());db.exec("CREATE TABLE orders(id INTEGER,user_id INTEGER);INSERT INTO orders VALUES(1,1),(2,2);CREATE TABLE order_fake_sites(id INTEGER,order_id INTEGER,apk_file TEXT);INSERT INTO order_fake_sites VALUES(9,1,'mine.apk'),(10,2,'other.apk');");
 const source=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
 const helper=source.slice(source.indexOf('function getDownloadableOrder('),source.indexOf('function findBuiltApk('));
 const start=source.indexOf("app.get('/api/orders/:id/fake-sites/:siteId/download'");const route=source.slice(start,source.indexOf('\n});',start)+4);
 let handler;vm.runInNewContext(helper+'\n'+route,{db,path,requireAuth(){},findBuiltApk:file=>'/builds/'+file,app:{get(url,auth,fn){handler=fn;}}});
 function call(user,id,siteId){let result={};const res={status(n){result.status=n;return this;},json(v){result.body=v;},download(file,name){result={file,name};}};handler({session:{userId:user},params:{id,siteId}},res);return result;}
 assert.equal(call(1,1,9).name,'mine.apk');assert.equal(call(2,1,9).status,404);assert.equal(call(1,1,10).status,404);
});
test('website receipts appear in combined history without passwords and stay owner-scoped',t=>{
 const db=new Database(':memory:');t.after(()=>db.close());db.exec(`CREATE TABLE designs(id,name);
 CREATE TABLE orders(id,user_id,design_id,app_name,status,created_at,icon_file,apk_file,fake_apk_file,fake_register_url,coins_spent,live_link_enabled);
 CREATE TABLE order_fake_sites(id,order_id,status,created_at,apk_file);
 CREATE TABLE welcome_orders(id,user_id,kind,parent_id,bot_name,bot_username,admin_tg_id,plan_json,price,coins,status,refunded,expires_at,created_at);`);
 require('../utils/site-store').schema(db);
 db.prepare('INSERT INTO site_sales(user_id,request_key,product_id,product_name,kind,plan,total,coupon,lease_ids,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(1,'test-history',1,'Website','purchase','{}',699,'','[1]','2026-10-07T00:00:00Z');
 db.prepare('INSERT INTO site_leases(user_id,product_id,stock_id,generation,username,url,product_name,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(1,1,1,1,'private-user','https://example.test','Website',Date.now()+86400000,'2026-10-07T00:00:00Z');
 const rows=customerHistory(db,1);assert.equal(rows.length,1);assert.equal(rows[0].source_kind,'account');assert.equal(rows[0].coins_spent,699);assert.equal(rows[0].status,'active');assert.doesNotMatch(JSON.stringify(rows),/private-user|password|cipher/);assert.deepEqual(customerHistory(db,2),[]);
});
