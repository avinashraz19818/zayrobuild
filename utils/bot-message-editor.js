'use strict';
const {isPrivateAdmin}=require('./site-stock-bot');
const {parseButtons}=require('./broadcast-bot');
const {esc}=require('./panel-links');
const LABELS={'welcome-3d':'Bot subscription · 3 day reminder','welcome-1d':'Bot subscription · 1 day reminder','welcome-expired':'Bot subscription expired',global:'All other notifications',welcome:'Welcome / Start',orders:'My orders',wallet:'Wallet',help:'Help', 'payment-approved':'Payment approved','payment-rejected':'Payment rejected','site-purchase':'Website purchase','site-renewal':'Website renewal','site-reminder':'Website reminder','site-expired':'Website expired','apk-ready':'APK ready','announcement':'Announcements','admin-log':'Admin notifications'};
function schema(db){db.exec('CREATE TABLE IF NOT EXISTS bot_message_templates(key TEXT PRIMARY KEY,html TEXT NOT NULL,buttons TEXT,updated_at INTEGER NOT NULL)');}
function render(template,html,rows,base){
 const website=(rows||[]).flat().find(b=>b.url)?.url||'https://website.example/login';
 let text=template.html.replaceAll('{original}',html);
 if(text.length>3900)return {html,rows};
 const added=template.buttons===null?null:parseButtons(template.buttons.replaceAll('{website_url}',website),base);
 // Approval/action callbacks are application logic, never editable URL buttons.
 const protectedRows=(rows||[]).filter(row=>row.some(b=>b.callback_data));
 return {html:text,rows:added===null?rows:[...added,...protectedRows]};
}
function apply(db,key,html,rows,base){
 if(!db||key===false)return {html,rows};
 try{const template=db.prepare('SELECT * FROM bot_message_templates WHERE key=?').get(key||'global');return template?render(template,html,rows,base):{html,rows};}catch{return {html,rows};}
}
function register(bot,db,getAdmins,{sendPremium,getSiteUrl}){
 schema(db);const sessions=new Map();
 const valid=(chat,from)=>isPrivateAdmin(chat,from,getAdmins());
 const send=(id,text,rows=[])=>sendPremium(id,`✏️ <b>MESSAGE STUDIO</b>\n\n${text}`,rows,{templateKey:false});
 const menu=id=>send(id,'Choose the automatic message to edit. Changes apply to future messages only. Transaction approval callbacks are protected.',Object.entries(LABELS).map(([key,label])=>[{text:label,callback_data:`me:pick:${key}`} ]));
 const controls=s=>[[{text:'Edit text',callback_data:`me:text:${s.key}`},{text:'Edit / Add buttons',callback_data:`me:buttons:${s.key}`}],[{text:'Preview',callback_data:`me:preview:${s.key}`,style:'primary'},{text:'Save',callback_data:`me:save:${s.key}`,style:'success'}],[{text:'Reset default',callback_data:`me:reset:${s.key}`,style:'danger'},{text:'Back',callback_data:'me:menu'}]];
 const show=(id,s)=>send(id,`<b>${esc(LABELS[s.key])}</b>\n\nText: <code>${esc(s.html.slice(0,900))}</code>\n\nButtons: ${s.buttons===null?'Default buttons':esc(s.buttons.slice(0,600))}\n\nUse <code>{original}</code> to keep live account/order details. Button target <code>{website_url}</code> uses the purchased website. Preview is required before Save.`,controls(s));
 async function callback(q){
  if(!String(q.data||'').startsWith('me:'))return;
  if(!valid(q.message?.chat,q.from)){try{await bot.answerCallbackQuery(q.id,{text:'Private admin only',show_alert:true});}catch{}return;}
  try{await bot.answerCallbackQuery(q.id);}catch{}
  const id=String(q.from.id),[,action,key]=q.data.split(':');
  if(action==='menu'){sessions.delete(id);await menu(id);return;}
  if(!LABELS[key])return;
  if(action==='pick'){const stored=db.prepare('SELECT * FROM bot_message_templates WHERE key=?').get(key);const s={key,html:stored?.html||'{original}',buttons:stored?.buttons??null,until:Date.now()+1800000,verified:false};sessions.set(id,s);await show(id,s);return;}
  const s=sessions.get(id);if(!s||s.key!==key||s.until<Date.now()){await send(id,'Editor expired. Open Message Studio again.');return;}
  if(action==='text'){s.step='text';s.verified=false;await send(id,'Send new text (Telegram HTML supported). Include <code>{original}</code> wherever live account/order details should appear. Max 1800 characters. /cancel discards the draft.');return;}
  if(action==='buttons'){s.step='buttons';s.verified=false;await send(id,'Send button rows. One per line; <code>||</code> places two beside each other.\n\n<code>My accounts | panel:fakesite/accounts | primary\nOpen website | {website_url} | success</code>\n\nSend <code>default</code> to restore default buttons or <code>-</code> for none. These rows replace URL buttons; required approval callbacks stay.');return;}
  if(action==='preview'){
   try{const snapshot=JSON.stringify([s.html,s.buttons]);const example='<b>Sample account / order</b>\nDemo customer · ₹999\nAccount: <code>demo-user</code>\nExpiry: 14 Oct 2026, 06:50 pm IST';const result=render(s,example,[[{text:'Default action',url:'https://website.example/login'}]],getSiteUrl());await sendPremium(id,result.html,result.rows,{templateKey:false});s.verified=JSON.stringify([s.html,s.buttons])===snapshot?snapshot:false;await send(id,'Preview accepted. Save to publish.',controls(s));}catch{s.verified=false;await send(id,'Preview failed. Check HTML, button URL or custom emoji, then try again.',controls(s));}return;
  }
  if(action==='save'){if(s.verified!==JSON.stringify([s.html,s.buttons])){await send(id,'Preview this draft successfully before saving.',controls(s));return;}db.prepare('INSERT INTO bot_message_templates VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET html=excluded.html,buttons=excluded.buttons,updated_at=excluded.updated_at').run(key,s.html,s.buttons,Date.now());await send(id,'Saved. Future messages use this template.',controls(s));return;}
  if(action==='reset'){db.prepare('DELETE FROM bot_message_templates WHERE key=?').run(key);s.html='{original}';s.buttons=null;s.verified=false;s.step=null;await show(id,s);}
 }
 async function message(msg){
  if(!valid(msg.chat,msg.from))return;const id=String(msg.from.id),s=sessions.get(id);if(!s)return;
  if(/^\/(cancel|start|admin|broadcast)(?:@\w+)?(?:\s|$)/.test(msg.text||'')){sessions.delete(id);return;}
  if(s.until<Date.now()){sessions.delete(id);await send(id,'Editor expired. Open /admin → Message Studio again.');return;}
  if(!s.step)return;const text=msg.text;
  if(!text?.trim()||text.length>1800){await send(id,'Send text between 1 and 1800 characters.');return;}
  if(s.step==='text')s.html=text;
  else{try{if(text==='default')s.buttons=null;else{parseButtons(text.replaceAll('{website_url}','https://website.example/login'),getSiteUrl(),msg.entities||[]);s.buttons=text;}}catch(e){await send(id,esc(e.message));return;}}
  s.step=null;s.verified=false;await show(id,s);
 }
 bot.on('callback_query',q=>{if((q.data==='bc:new'||q.data==='ws:add')&&valid(q.message?.chat,q.from))sessions.delete(String(q.from.id));void callback(q).catch(async()=>{if(valid(q.message?.chat,q.from))await send(String(q.from.id),'Editor action failed. Your published template is unchanged unless Save already succeeded. Reopen Message Studio to check.').catch(()=>{});});});
 bot.on('message',m=>{void message(m).catch(()=>{});});
 return {callback,message};
}
module.exports={register,apply,render,schema,LABELS};
