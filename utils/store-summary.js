'use strict';
// Recorded purchases, not wallet deposits or profit. Add-ons bundled into an
// APK order are already in coins_spent and must not be counted twice.
function salesSummary(db,now=new Date()){
 const day=new Date(new Date(now).getTime()+19800000).toISOString().slice(0,10);
 const sources=[['orders','coins_spent','1=1'],['site_sales','total','1=1'],['welcome_orders','price','refunded=0']];
 let total=0,today=0;
 for(const [table,amount,where] of sources){
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))continue;
  const result=db.prepare(`SELECT COALESCE(SUM(${amount}),0) total,COALESCE(SUM(CASE WHEN date(created_at,'+5 hours','+30 minutes')=? THEN ${amount} ELSE 0 END),0) today FROM ${table} WHERE ${where}`).get(day);
  total+=Number(result.total);today+=Number(result.today);
 }
 return {sales_total:total,sales_today:today,sales_timezone:'Asia/Kolkata',sales_basis:'Recorded APK, website and bot purchases incl. renewals; refunded bot payments excluded. Not wallet deposits or profit.'};
}
function syncFileBotToken(db,parsed,env=process.env){
 const token=String(parsed?.TELEGRAM_BOT_TOKEN||'').trim();if(!token)return '';
 const previous=db.prepare("SELECT value FROM settings WHERE key='telegram_bot_token'").get()?.value;
 db.transaction(()=>{
  db.prepare("INSERT INTO settings(key,value) VALUES('telegram_bot_token',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(token);
  if(previous!==token)db.prepare("DELETE FROM settings WHERE key='telegram_bot_username'").run();
 })();env.TELEGRAM_BOT_TOKEN=token;return token;
}
const referralsEnabled=()=>false;
module.exports={salesSummary,syncFileBotToken,referralsEnabled};
