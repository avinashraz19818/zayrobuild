'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Database=require('better-sqlite3');
const {listAllOrders}=require('../utils/admin-all-orders');

function fixture(t){
  const db=new Database(':memory:');t.after(()=>db.close());
  db.exec(`
    CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,first_name TEXT,telegram_id TEXT);
    CREATE TABLE designs(id INTEGER PRIMARY KEY,name TEXT,category TEXT);
    CREATE TABLE orders(id INTEGER PRIMARY KEY,user_id INTEGER,design_id INTEGER,app_name TEXT,package_name TEXT,status TEXT,coins_spent INTEGER,apk_file TEXT,created_at TEXT);
    CREATE TABLE site_sales(id INTEGER PRIMARY KEY,user_id INTEGER,product_name TEXT,kind TEXT,plan TEXT,total INTEGER,created_at TEXT);
    CREATE TABLE welcome_orders(id INTEGER PRIMARY KEY,user_id INTEGER,bot_name TEXT,bot_username TEXT,kind TEXT,coins INTEGER,status TEXT,created_at TEXT);
    INSERT INTO users VALUES(1,'raj',NULL,'111'),(2,NULL,'Asha',NULL),(3,'',NULL,'333');
    INSERT INTO designs VALUES(10,'Red Wings','zayro');
    INSERT INTO orders VALUES(1,1,10,'Wingo Pro','com.a.pro','done',300,'a.apk','2026-10-01 10:00:00'),
                              (2,2,10,'Lottery X','com.b.x','building',200,'','2026-10-03 10:00:00'),
                              (3,1,10,'Broken','com.c','failed',100,'','2026-10-02 10:00:00');
    INSERT INTO site_sales VALUES(5,3,'Netflix Premium','fake','monthly',150,'2026-10-04 09:00:00');
    INSERT INTO welcome_orders VALUES(7,1,'Helper Bot','helperbot','deploy',500,'active','2026-10-05 08:00:00'),
                                     (8,2,'Old Bot','oldbot','renew',400,'expired','2026-09-01 08:00:00'),
                                     (9,2,'Prov Bot','provbot','deploy',250,'provisioning','2026-10-06 08:00:00');
  `);
  return db;
}

test('all types are merged, newest first, with common shape',t=>{
  const db=fixture(t);
  const r=listAllOrders(db,{type:'all',limit:50});
  assert.equal(r.pagination.total,7);
  assert.deepEqual(r.orders.map(o=>`${o.kind}#${o.id}`),['bot#9','bot#7','site#5','apk#2','apk#3','apk#1','bot#8']);
  const apk1=r.orders.find(o=>o.kind==='apk'&&o.id===1);
  assert.equal(apk1.title,'Wingo Pro');assert.equal(apk1.detail,'Red Wings');assert.equal(apk1.user_name,'raj');assert.equal(apk1.has_apk,1);assert.equal(apk1.status,'done');
  const site=r.orders.find(o=>o.kind==='site');
  assert.equal(site.title,'Netflix Premium');assert.equal(site.detail,'fake · monthly');assert.equal(site.user_name,'333','username empty → telegram id fallback');assert.equal(site.status,'done');assert.equal(site.amount,150);
});

test('bot statuses are normalized: active→done, provisioning→building, expired kept',t=>{
  const db=fixture(t);
  const bots=listAllOrders(db,{type:'bot',limit:50}).orders;
  const byId=Object.fromEntries(bots.map(b=>[b.id,b.status]));
  assert.equal(byId[7],'done');assert.equal(byId[9],'building');assert.equal(byId[8],'expired');
  assert.equal(bots.find(b=>b.id===8).detail,'renew · @oldbot');
});

test('type filter returns only that kind',t=>{
  const db=fixture(t);
  assert.deepEqual([...new Set(listAllOrders(db,{type:'apk'}).orders.map(o=>o.kind))],['apk']);
  assert.equal(listAllOrders(db,{type:'site'}).pagination.total,1);
  assert.equal(listAllOrders(db,{type:'bot'}).pagination.total,3);
  assert.equal(listAllOrders(db,{type:'bogus'}).pagination.total,7,'unknown type falls back to all');
});

test('status filter applies across kinds using normalized status',t=>{
  const db=fixture(t);
  const done=listAllOrders(db,{status:'done',limit:50}).orders;
  assert.ok(done.every(o=>o.status==='done'));
  assert.deepEqual(done.map(o=>`${o.kind}#${o.id}`).sort(),['apk#1','bot#7','site#5'].sort());
  assert.equal(listAllOrders(db,{status:'building'}).pagination.total,2);
  assert.equal(listAllOrders(db,{status:'expired'}).pagination.total,1);
  assert.equal(listAllOrders(db,{status:'x; DROP TABLE orders'}).pagination.total,7,'invalid status ignored, no SQL injection');
});

test('search matches title, detail, user name and id',t=>{
  const db=fixture(t);
  assert.deepEqual(listAllOrders(db,{search:'netflix'}).orders.map(o=>o.kind),['site']);
  assert.deepEqual(listAllOrders(db,{search:'helperbot'}).orders.map(o=>`${o.kind}#${o.id}`),['bot#7']);
  assert.equal(listAllOrders(db,{search:'asha'}).pagination.total,3);
  assert.equal(listAllOrders(db,{search:'  '}).pagination.total,7);
});

test('pagination splits results and clamps bad input',t=>{
  const db=fixture(t);
  const p1=listAllOrders(db,{limit:3,page:1});const p3=listAllOrders(db,{limit:3,page:3});
  assert.equal(p1.orders.length,3);assert.equal(p1.pagination.totalPages,3);assert.equal(p3.orders.length,1);
  const bad=listAllOrders(db,{page:'abc',limit:'-5'});
  assert.equal(bad.pagination.page,1);assert.equal(bad.pagination.limit,1);
  assert.equal(listAllOrders(db,{limit:9999}).pagination.limit,100);
});

test('missing tables (older installs) do not crash the list',t=>{
  const db=new Database(':memory:');t.after(()=>db.close());
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,first_name TEXT,telegram_id TEXT);CREATE TABLE orders(id INTEGER PRIMARY KEY,user_id INTEGER,design_id INTEGER,app_name TEXT,package_name TEXT,status TEXT,coins_spent INTEGER,apk_file TEXT,created_at TEXT);CREATE TABLE designs(id INTEGER PRIMARY KEY,name TEXT,category TEXT);INSERT INTO orders VALUES(1,1,1,'A','p','done',1,'x.apk','2026-10-01');");
  const r=listAllOrders(db,{type:'all'});
  assert.equal(r.pagination.total,1);assert.equal(r.orders[0].kind,'apk');
  assert.equal(listAllOrders(db,{type:'site'}).pagination.total,0);
});
