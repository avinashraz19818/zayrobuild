'use strict';
const {esc,panelLink}=require('./panel-links');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function createStockAlerts(db,{now=()=>Date.now(),send=(...args)=>require('./telegram').sendStockAlert(...args),delay=sleep}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS stock_alerts(id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL,product_name TEXT NOT NULL,added INTEGER NOT NULL,available INTEGER NOT NULL,created_at INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'queued',next_at INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS stock_alert_recipients(event_id INTEGER NOT NULL,chat_id TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',PRIMARY KEY(event_id,chat_id));
 CREATE TABLE IF NOT EXISTS stock_alert_control(id INTEGER PRIMARY KEY CHECK(id=1),blocked_until INTEGER NOT NULL);`);
 // An interrupted send may have reached Telegram. Never automatically duplicate it.
 db.prepare("UPDATE stock_alert_recipients SET state='unknown' WHERE state='sending'").run();
 function enqueue(productId,added){
  const p=db.prepare('SELECT id,name,enabled FROM site_products WHERE id=?').get(productId);
  if(!p?.enabled||added<1)return;
  const available=db.prepare("SELECT count(*) n FROM site_stock WHERE product_id=? AND state='available'").get(productId).n;
  db.prepare('INSERT INTO stock_alerts(product_id,product_name,added,available,created_at) VALUES(?,?,?,?,?)').run(p.id,p.name,added,available,now());
 }
 function message(event,url){
  const when=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(event.created_at));
  return {html:`<tg-emoji emoji-id="5427168083074628963">💎</tg-emoji> <b>ꜱᴛᴏᴄᴋ ᴅʀᴏᴘ · ɴᴏᴡ ᴀᴠᴀɪʟᴀʙʟᴇ</b>\n\n<b>${esc(event.product_name)}</b>\n━━━━━━━━━━━━━━━━━━\n✨ <b>${event.added} account${event.added===1?'':'s'} added</b>\n📦 <b>${event.available} available</b> at this stock update\n🕒 ${esc(when)} IST\n\nChoose your plan and get your login in the panel.\n<i>Live stock may change as accounts are purchased.</i>`,rows:[[{text:'View Stock · Buy Now',emoji:'🛍️',icon:'5406966974980828470',style:'success',web_app:{url}}]]};
 }
 let busy=false;
 async function tick(){
  if(busy||(db.prepare('SELECT blocked_until FROM stock_alert_control WHERE id=1').get()?.blocked_until||0)>now())return;busy=true;
  try{
   let count=0;
   for(const event of db.prepare("SELECT * FROM stock_alerts WHERE state IN ('queued','running') AND next_at<=? ORDER BY id LIMIT 10").all(now())){
    const base=db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value||process.env.SITE_URL||process.env.BASE_URL;
    const url=panelLink(base,'fakesite');if(!url)return;
    const active=()=>db.prepare("SELECT 1 FROM site_products p WHERE p.id=? AND p.enabled=1 AND EXISTS(SELECT 1 FROM site_stock s WHERE s.product_id=p.id AND s.state='available')").get(event.product_id);
    if(!active()){db.prepare("UPDATE stock_alerts SET state='cancelled' WHERE id=?").run(event.id);continue;}
    if(event.state==='queued')db.transaction(()=>{
     const insert=db.prepare('INSERT OR IGNORE INTO stock_alert_recipients(event_id,chat_id) VALUES(?,?)');
     for(const u of db.prepare("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL").all())if(/^[1-9]\d*$/.test(String(u.telegram_id)))insert.run(event.id,String(u.telegram_id));
     db.prepare("UPDATE stock_alerts SET state='running' WHERE id=?").run(event.id);
    })();
    const {html,rows}=message(event,url);
    while(count<100){
     if(!active()){db.prepare("UPDATE stock_alerts SET state='cancelled' WHERE id=?").run(event.id);break;}
     const recipient=db.prepare("SELECT chat_id FROM stock_alert_recipients WHERE event_id=? AND state='pending' LIMIT 1").get(event.id);
     if(!recipient){db.prepare("UPDATE stock_alerts SET state='done' WHERE id=?").run(event.id);break;}
     count++;db.prepare("UPDATE stock_alert_recipients SET state='sending' WHERE event_id=? AND chat_id=?").run(event.id,recipient.chat_id);
     let state='sent',retry=0;
     try{await send(recipient.chat_id,html,rows);}catch(e){
      const code=e.response?.body?.error_code;
      if(e.code==='BOT_NOT_READY'){state='pending';retry=300000;}
      else if(code===429){state='pending';retry=Math.max(1000,Number(e.response?.body?.parameters?.retry_after||5)*1000)+1000;}
      else state=code===403?'blocked':code===400?'failed':'unknown';
     }
     db.prepare('UPDATE stock_alert_recipients SET state=? WHERE event_id=? AND chat_id=?').run(state,event.id,recipient.chat_id);
     if(retry){db.prepare('UPDATE stock_alerts SET next_at=? WHERE id=?').run(now()+retry,event.id);db.prepare('INSERT INTO stock_alert_control VALUES(1,?) ON CONFLICT(id) DO UPDATE SET blocked_until=excluded.blocked_until').run(now()+retry);return;}
     await delay(150);
    }
    if(count>=100)break;
   }
  }finally{busy=false;}
 }
 return {enqueue,tick,message};
}
module.exports={createStockAlerts};
