'use strict';
const {esc,panelLink}=require('./panel-links');
const DAY=86400000;
function createNotifications(db,{now=()=>Date.now(),notify=(...args)=>require('./telegram').sendUserNotice(...args)}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS welcome_notifications(order_id INTEGER NOT NULL,expiry INTEGER NOT NULL,phase TEXT NOT NULL,sent_at INTEGER,next_at INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(order_id,expiry,phase));`);
 let busy=false;
 async function tick(fleet){
  // Only a freshly contacted, upgraded runtime can delegate delivery. Do not
  // guess expiry from stale cached data or duplicate an old manager's notices.
  if(busy||fleet?.subscription_notice_owner!=='builder')return;
  busy=true;
  try{
   let processed=0;
   for(const bot of fleet.bots||[]){
    if(processed>=30)break;
    if(!['active','stopped','expired'].includes(bot.status))continue;
    const expiry=Date.parse(bot.expires_at),left=expiry-now();if(!Number.isFinite(expiry)||left>3*DAY)continue;
    const phase=left<=0?'expired':left<=DAY?'1d':'3d';
    if(phase==='expired'&&bot.status!=='expired')continue;
    const order=db.prepare("SELECT w.*,u.telegram_id FROM welcome_orders w JOIN users u ON u.id=w.user_id WHERE w.remote_id=? AND w.kind='deploy' AND w.refunded=0 AND w.status NOT IN ('pending','provisioning','failed') ORDER BY w.id DESC LIMIT 1").get(bot.remote_id);
    if(!order||Date.parse(order.expires_at)!==expiry)continue;
    // Each validity period has independent delivery state. Old jobs are never
    // replayed: only the current authoritative expiry/phase is selected here.
    db.prepare('INSERT OR IGNORE INTO welcome_notifications(order_id,expiry,phase,sent_at) VALUES(?,?,?,?)').run(order.id,expiry,phase,bot.legacy_reminders?.[phase]===true?now():null);
    const job=db.prepare('SELECT * FROM welcome_notifications WHERE order_id=? AND expiry=? AND phase=?').get(order.id,expiry,phase);
    if(job.sent_at!==null||job.next_at>now())continue;
    const base=db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value||process.env.SITE_URL||process.env.BASE_URL;
    const url=panelLink(base,'deploy');
    const when=new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(expiry));
    const heading=phase==='expired'?'Subscription expired':phase==='1d'?'Expires within 24 hours':'Expires within 3 days';
    const text=`🤖 <b>Welcome Bot · ${heading}</b>\n\n<b>${esc(order.bot_name)}</b>${order.bot_username?'\n@'+esc(order.bot_username):''}\n🗓 <b>Expiry:</b> ${esc(when)} IST\n\n${phase==='expired'?'Renew your subscription to restore service.':'Renew before expiry to keep your bot service active.'}\n\n<i>Open Deploy Bot below and choose your bot’s renewal plan.</i>`;
    processed++;let result=null;
    try{if(order.telegram_id&&url)result=await notify(order.telegram_id,text,{templateKey:'welcome-'+phase,inline_keyboard:[[{text:'Renew · Deploy Bot',emoji:'🤖',icon:'5287684458881756303',style:'success',web_app:{url}}]]});}catch{/* No tokens, identities or message content in logs. */}
    db.prepare('UPDATE welcome_notifications SET sent_at=?,next_at=?,attempts=attempts+1 WHERE order_id=? AND expiry=? AND phase=?').run(result?now():null,now()+300000,order.id,expiry,phase);
   }
  }finally{busy=false;}
 }
 return {tick};
}
module.exports={createNotifications};
