const {test}=require('node:test'),assert=require('node:assert/strict'),DB=require('better-sqlite3');
const {salesSummary,syncFileBotToken,referralsEnabled}=require('../utils/store-summary');
test('sales include paid source records once, renewals and IST boundaries, excluding refunded bots',t=>{
 const db=new DB(':memory:');t.after(()=>db.close());db.exec(`CREATE TABLE orders(coins_spent INTEGER,created_at TEXT);CREATE TABLE site_sales(total INTEGER,created_at TEXT);CREATE TABLE welcome_orders(price INTEGER,refunded INTEGER,created_at TEXT);
 INSERT INTO orders VALUES(100,'2026-10-06 18:29:59'),(200,'2026-10-06 18:30:00');INSERT INTO site_sales VALUES(300,'2026-10-07T12:00:00.000Z');INSERT INTO welcome_orders VALUES(400,0,'2026-10-07 13:00:00'),(500,1,'2026-10-07 13:00:00');`);
 const s=salesSummary(db,'2026-10-07T15:00:00Z');assert.equal(s.sales_today,900);assert.equal(s.sales_total,1000);
});
test('fresh env-file token replaces saved and stale PM2 token, clears old bot identity, keeps fallback if empty',t=>{
 const db=new DB(':memory:');t.after(()=>db.close());db.exec("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);INSERT INTO settings VALUES('telegram_bot_token','saved-old'),('telegram_bot_username','old_bot');");const env={TELEGRAM_BOT_TOKEN:'pm2-old'};
 assert.equal(syncFileBotToken(db,{TELEGRAM_BOT_TOKEN:'new-file-token'},env),'new-file-token');assert.equal(env.TELEGRAM_BOT_TOKEN,'new-file-token');assert.equal(db.prepare("SELECT value FROM settings WHERE key='telegram_bot_token'").get().value,'new-file-token');assert.equal(db.prepare("SELECT value FROM settings WHERE key='telegram_bot_username'").get(),undefined);
 assert.equal(syncFileBotToken(db,{},env),'');assert.equal(db.prepare("SELECT value FROM settings WHERE key='telegram_bot_token'").get().value,'new-file-token');assert.equal(referralsEnabled(),false);
});
