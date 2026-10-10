// Synthetic accounts only, backed by an in-memory store for browser regression tests.
const Database=require('better-sqlite3'),crypto=require('crypto');const {createStore,DAY}=require('../utils/site-store');
let db,store;
function reset(){db?.close();db=new Database(':memory:');db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,coins INTEGER,telegram_id TEXT);INSERT INTO users VALUES(42,10000,'123456789');CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);");store=createStore(db,crypto.randomBytes(32));for(const name of ['Demo Blue Website','Demo Purple Website']){const id=store.saveProduct({name,url:'https://example.test/login',enabled:true,plans:[{key:'week',days:7,price:699,original_price:999},{key:'month',days:30,price:999,original_price:1499}]});for(let i=1;i<=3;i++)store.addStock(id,{username:`sample-${id}-${i}`,password:`sample-password-${i}`});}store.moveProduct(2,'up');}
reset();
function response(p,b){if(p==='/api/__site_expire'){db.prepare('UPDATE site_leases SET expires_at=?').run(Date.now()-1);return {success:true};}
if(p==='/api/site-store')return store.products();if(p==='/api/site-store/quote'){const {product,parent,...q}=store.quote(42,b);return q;}if(p==='/api/site-store/purchase')return store.purchase(42,b);if(p==='/api/me/site-accounts')return store.accounts(42);
if(p==='/api/admin/site-store')return {products:store.products(true),coupons:db.prepare('SELECT * FROM site_coupons').all(),notifications:{pending:0,retrying:0}};
if(p==='/api/admin/site-store/products')return {id:store.saveProduct(b)};
const m=p.match(/^\/api\/admin\/site-store\/products\/(\d+)\/stock$/);if(m){if(b){store.addStock(Number(m[1]),b);return {success:true};}return store.inventory(Number(m[1]));}
const movement=p.match(/^\/api\/admin\/site-store\/products\/(\d+)\/move$/);if(movement)return store.moveProduct(Number(movement[1]),b.direction);
const removal=p.match(/^\/api\/admin\/site-store\/products\/(\d+)\/remove-stock$/);if(removal)return store.removeStock(Number(removal[1]),b);
const r=p.match(/^\/api\/admin\/site-store\/stock\/(\d+)\/restock$/);if(r){store.restock(Number(r[1]),b);return {success:true};}
if(p==='/api/admin/site-store/coupons'){store.coupon(b);return {success:true};}
if(p==='/api/admin/site-store/reminders')return {success:true};
return undefined;}
module.exports={reset,response,history:()=>db.prepare('SELECT * FROM site_sales ORDER BY id DESC').all().map(s=>({key:`website-${s.id}`,kind:'fake',source_kind:'account',id:s.id,app_name:s.product_name,purchase_type:s.kind,coins_spent:s.total,created_at:s.created_at,status:'active',lease_ids:JSON.parse(s.lease_ids)})),balance:()=>db.prepare('SELECT coins FROM users WHERE id=42').get().coins};
