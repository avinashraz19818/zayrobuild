'use strict';
const {createReaders}=require('./crypto-readers');
const {safeReaderError}=require('./crypto-reader-errors');
function createMonitor(db,automatic,{readers=createReaders(),now=()=>Date.now(),notify=(...a)=>require('./telegram').sendUserNotice(...a)}={}){
 for(const col of ['retry_at','failures'])if(!db.prepare('PRAGMA table_info(crypto_cursors)').all().some(c=>c.name===col))db.exec(`ALTER TABLE crypto_cursors ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
 let busy=false;
 async function tick(){if(busy)return;busy=true;try{
  const watches=db.prepare('SELECT i.network,i.address,min(q.created_at) since FROM crypto_invoices i JOIN deposit_quotes q ON q.id=i.quote_id GROUP BY i.network,i.address').all();
  for(const w of watches){if(!automatic.enabled(w.network))continue;
   db.prepare('INSERT OR IGNORE INTO crypto_cursors(network,address) VALUES(?,?)').run(w.network,w.address);
   const row=db.prepare('SELECT * FROM crypto_cursors WHERE network=? AND address=?').get(w.network,w.address);
   if(row.retry_at>now())continue;
   try{const next=await readers[w.network](w,JSON.parse(row.cursor),e=>automatic.observe(e));db.prepare('UPDATE crypto_cursors SET cursor=?,last_ok=?,error=NULL,retry_at=0,failures=0 WHERE network=? AND address=?').run(JSON.stringify(next),now(),w.network,w.address);}
   catch(e){const pause=e.code==='RATE_LIMIT'?Math.min(300000,30000*2**Math.min(row.failures,4)):30000;db.prepare('UPDATE crypto_cursors SET error=?,retry_at=?,failures=failures+1 WHERE network=? AND address=?').run(safeReaderError(e),now()+pause,w.network,w.address);}
  }
  const notices=db.prepare('SELECT n.quote_id,n.attempts,q.credit_inr,u.telegram_id FROM crypto_notices n JOIN deposit_quotes q ON q.id=n.quote_id JOIN users u ON u.id=q.user_id WHERE n.sent=0 AND n.attempts<12 AND n.next_at<=? LIMIT 10').all(now());
  for(const n of notices){if(!n.telegram_id)continue;db.prepare('UPDATE crypto_notices SET attempts=attempts+1,next_at=? WHERE quote_id=?').run(now()+60000*Math.min(2**n.attempts,360),n.quote_id);try{
   const url=require('./panel-links').panelLink(db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value||process.env.SITE_URL,'wallet');
   if(await notify(n.telegram_id,`✅ <b>Payment received</b>\n\n<b>₹${n.credit_inr}</b> has been added to your wallet.`,{inline_keyboard:url?[[{text:'Open wallet',style:'success',web_app:{url}}]]:[],templateKey:false}))db.prepare('UPDATE crypto_notices SET sent=1 WHERE quote_id=?').run(n.quote_id);
  }catch{}}

 }finally{busy=false;}}
 return {tick};
}
module.exports={createMonitor};
