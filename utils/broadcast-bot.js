'use strict';
const crypto=require('crypto');
const {isPrivateAdmin}=require('./site-stock-bot');
const {httpsUrl,panelLink,esc}=require('./panel-links');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function parseButtons(input,base,entities=[]){
 if(input.trim()==='-')return [];
 let rows;
 if(input.trim().startsWith('[')){try{rows=JSON.parse(input);}catch{throw Error('Invalid JSON button rows.');}}
 else rows=input.trim().split('\n').filter(Boolean).map(line=>line.split(/\|\||;;/).map(part=>{const [text,target,style,icon]=part.split('|').map(s=>s.trim());return {text,target,style,icon};}));
 if(!Array.isArray(rows)||rows.length>8)throw Error('Use up to 8 rows, with 1 or 2 buttons per row.');
 return rows.map(row=>{if(!Array.isArray(row)||row.length<1||row.length>2)throw Error('Each row needs 1 or 2 buttons.');return row.map(b=>{
  if(!b||typeof b.text!=='string'||!b.text.trim()||b.text.length>48)throw Error('Button labels must be 1–48 characters.');
  const labelOffset=input.indexOf(b.text);const premium=entities.find(e=>e.type==='custom_emoji'&&e.offset>=labelOffset&&e.offset<labelOffset+b.text.length);if(!b.icon&&premium)b.icon=premium.custom_emoji_id;
  const target=b.target||b.url;let destination;
  if(typeof target!=='string')throw Error('Every button needs a target.');
  if(target.startsWith('panel:')){const url=panelLink(base,target.slice(6));if(!url)throw Error('Unknown panel section or missing HTTPS panel URL.');destination={web_app:{url}};}
  else {const url=httpsUrl(target);if(!url)throw Error('Use a full HTTPS URL or panel:deploy / panel:fakesite/accounts.');destination=httpsUrl(base)&&new URL(url).origin===new URL(base).origin?{web_app:{url}}:{url};}
  if(b.style&&!['primary','success','danger'].includes(b.style))throw Error('Styles: primary, success or danger.');
  if(b.icon&&!/^\d{5,25}$/.test(String(b.icon)))throw Error('Custom emoji ID must contain digits only.');
  return {text:b.text.trim(),emoji:'✨',icon:String(b.icon||'5463297803235113601'),...(b.style?{style:b.style}:{}),...destination};
 });});
}
function register(bot,db,getAdminIds,{sendPremium,sendWithFallback,getSiteUrl,delay=wait,now=()=>Date.now()}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS bot_broadcasts(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL,source_chat TEXT,source_message INTEGER,buttons TEXT NOT NULL DEFAULT '[]',state TEXT NOT NULL,updated_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS bot_broadcast_recipients(job_id TEXT NOT NULL,chat_id TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending',PRIMARY KEY(job_id,chat_id));`);
 if(!db.prepare('PRAGMA table_info(bot_broadcasts)').all().some(c=>c.name==='payload'))db.exec("ALTER TABLE bot_broadcasts ADD COLUMN payload TEXT NOT NULL DEFAULT '{}'");
 if(!db.prepare('PRAGMA table_info(bot_broadcasts)').all().some(c=>c.name==='builder'))db.exec("ALTER TABLE bot_broadcasts ADD COLUMN builder TEXT NOT NULL DEFAULT '{}'");
 // An interrupted API request can have succeeded: never silently resend it.
 db.prepare("UPDATE bot_broadcast_recipients SET state='unknown' WHERE state='sending'").run();
 db.prepare("UPDATE bot_broadcasts SET state='paused' WHERE state='running'").run();
 let stopped=false;const workers=new Set();
 const valid=(chat,from)=>isPrivateAdmin(chat,from,getAdminIds());
 const load=(id,admin)=>db.prepare('SELECT * FROM bot_broadcasts WHERE id=? AND admin_id=?').get(id,String(admin));
 const change=(id,state)=>db.prepare('UPDATE bot_broadcasts SET state=?,updated_at=? WHERE id=?').run(state,now(),id);
 const controls=job=>[[{text:'Status',callback_data:`bc:status:${job.id}`,emoji:'📊',style:'primary'},...(job.state==='paused'?[{text:'Resume pending',callback_data:`bc:resume:${job.id}`,emoji:'▶️',style:'success'}]:[])],[{text:'Cancel broadcast',callback_data:`bc:cancel:${job.id}`,emoji:'✖️',style:'danger'}]];
 const send=(id,text,rows=[])=>sendPremium(id,`<tg-emoji emoji-id="5256134032852278918">📡</tg-emoji> <b>BROADCAST STUDIO</b>\n\n${text}`,rows);
 const counts=id=>db.prepare('SELECT state,count(*) n FROM bot_broadcast_recipients WHERE job_id=? GROUP BY state').all(id).reduce((a,r)=>(a[r.state]=r.n,a),{});
 const status=job=>{const c=counts(job.id);return `<b>Campaign ${job.id}</b> · ${esc(job.state)}\n\n✅ Sent: ${c.sent||0}\n🚫 Blocked: ${c.blocked||0}\n⚠️ Failed: ${c.failed||0}\n⏳ Pending: ${c.pending||0}\n❔ Unconfirmed: ${(c.unknown||0)+(c.sending||0)}\n\n<i>Unconfirmed deliveries are not retried automatically to avoid duplicates.</i>`;};
 const copy=(job,chat)=>{
  const payload=JSON.parse(job.payload||'{}'),prefix='✨ EXCLUSIVE UPDATE\n\n';
  const decorate=(text,entities=[])=>({text:prefix+text,entities:[{type:'bold',offset:2,length:16},...entities.map(e=>({...e,offset:e.offset+prefix.length}))]});
  return sendWithFallback(reply_markup=>{
   if(payload.text&&payload.text.length+prefix.length<=4096){const content=decorate(payload.text,payload.entities);return bot.sendMessage(chat,content.text,{entities:content.entities,disable_web_page_preview:true,reply_markup});}
   const options={reply_markup};
   if(payload.captionable&&(payload.caption||'').length+prefix.length<=1024){const content=decorate(payload.caption||'',payload.caption_entities);options.caption=content.text;options.caption_entities=content.entities;}
   return bot.copyMessage(chat,job.source_chat,job.source_message,options);
  },JSON.parse(job.buttons));
 };
 async function run(id){
  if(workers.has(id)||stopped)return;workers.add(id);
  try{
   while(!stopped){
    const job=db.prepare('SELECT * FROM bot_broadcasts WHERE id=?').get(id);if(job?.state!=='running')break;
    if(!isPrivateAdmin({id:job.admin_id,type:'private'},{id:job.admin_id},getAdminIds())){change(id,'paused');break;}
    const recipient=db.prepare("SELECT * FROM bot_broadcast_recipients WHERE job_id=? AND state='pending' LIMIT 1").get(id);
    if(!recipient){change(id,'done');await send(job.admin_id,status({...job,state:'done'}),[[{text:'New broadcast',callback_data:'bc:new',emoji:'✨'}]]).catch(()=>{});break;}
    db.prepare("UPDATE bot_broadcast_recipients SET state='sending' WHERE job_id=? AND chat_id=?").run(id,recipient.chat_id);
    let result='unknown';
    for(let attempt=0;attempt<3;attempt++){
     try{await copy(job,recipient.chat_id);result='sent';break;}catch(e){
      const code=e.response?.body?.error_code;
      if(code===429){
       const seconds=Number(e.response?.body?.parameters?.retry_after)||5;
       if(seconds>60||attempt===2){result='pending';change(id,'paused');break;}
       await delay(seconds*1000+250);
       if(stopped||load(id,job.admin_id)?.state!=='running'){result='pending';break;}
       continue;
      }
      result=code===403?'blocked':code===400?'failed':'unknown';break;
     }
    }
    db.prepare('UPDATE bot_broadcast_recipients SET state=? WHERE job_id=? AND chat_id=?').run(result,id,recipient.chat_id);
    await delay(120);
   }
  }finally{workers.delete(id);}
 }
 const ready=job=>send(job.admin_id,`<b>Draft saved</b>\n${JSON.parse(job.buttons).flat().length} buttons · Nothing sent yet.\n\nAdd buttons one by one, use bulk rows, or preview before sending.`,[
 [{text:'Add Button',callback_data:`bc:add:${job.id}`,emoji:'➕'},{text:'Bulk buttons',callback_data:`bc:edit:${job.id}`,emoji:'🔘'}],
 [{text:'Preview · Send',callback_data:`bc:view:${job.id}`,style:'success',emoji:'👁️'},{text:'Edit content',callback_data:`bc:content:${job.id}`,emoji:'✏️'}],
 [{text:'Clear buttons',callback_data:`bc:clear:${job.id}`,emoji:'🧹'},{text:'Cancel',callback_data:`bc:cancel:${job.id}`,style:'danger',emoji:'✖️'}]]);
 const builder=(id,value)=>db.prepare('UPDATE bot_broadcasts SET builder=?,updated_at=? WHERE id=?').run(JSON.stringify(value),now(),id);
 const placement=job=>send(job.admin_id,'<b>Button position</b>\nChoose a new row, or add beside the last button.',[[{text:'New row',callback_data:`bc:row:${job.id}`}],...(JSON.parse(job.buttons).at(-1)?.length===1?[[{text:'Same row (2 buttons)',callback_data:`bc:same:${job.id}`}]]:[]),[{text:'Back to draft',callback_data:`bc:ready:${job.id}`}]]);
 async function targetStep(job,state){
  builder(job.id,{...state,step:'link'});
  await send(job.admin_id,'<b>Send button link</b>\nPaste the exact HTTPS URL, or choose a panel section below.',[[{text:'Fake Websites',callback_data:`bc:target:${job.id}:fakesite`},{text:'My accounts',callback_data:`bc:target:${job.id}:fakesite/accounts`}],[{text:'Deploy Bot',callback_data:`bc:target:${job.id}:deploy`},{text:'Wallet',callback_data:`bc:target:${job.id}:wallet`}]]);
 }
 async function colorStep(job,state,target){
  const pending=parseButtons(JSON.stringify([[{text:state.text,target,icon:state.icon}]]),getSiteUrl())[0][0];
  const nonce=crypto.randomBytes(3).toString('hex');builder(job.id,{...state,step:'color',pending,nonce});
  await send(job.admin_id,'<b>Choose button color</b>',[[...['primary','success','danger'].map((style,i)=>({text:['Blue','Green','Red'][i],style,callback_data:`bc:color:${job.id}:${style}:${nonce}`}))]]);
 }
 async function start(admin,force=false){
  const active=db.prepare("SELECT * FROM bot_broadcasts WHERE admin_id=? AND state IN ('running','paused') ORDER BY updated_at DESC LIMIT 1").get(admin);
  if(active){await send(admin,status(active),controls(active));return;}
  const draft=db.prepare("SELECT * FROM bot_broadcasts WHERE admin_id=? AND state IN ('content','buttons','preview') ORDER BY updated_at DESC LIMIT 1").get(admin);
  if(!force&&draft&&now()-draft.updated_at<=30*60*1000){
   if(draft.state==='content')await send(admin,'Your draft is waiting for content. Send text/media or /cancel.');
   else {builder(draft.id,{});change(draft.id,'buttons');await ready(load(draft.id,admin));}
   return;
  }
  db.prepare("UPDATE bot_broadcasts SET state='cancelled' WHERE admin_id=? AND state IN ('content','buttons','preview')").run(admin);
  const id=crypto.randomBytes(6).toString('hex');db.prepare("INSERT INTO bot_broadcasts(id,admin_id,state,updated_at) VALUES(?,?,'content',?)").run(id,admin,now());
  await send(admin,'<b>1 · Send your content</b>\n\nSend one text, photo, video, document, animation, voice or sticker message. Telegram formatting and custom emoji are preserved. For an album, send one selected media item instead.\n\nNext: button rows → private preview → explicit confirmation. Nothing is sent to customers yet.',[[{text:'Cancel',callback_data:`bc:cancel:${id}`,emoji:'✖️'}]]);
 }
 async function preview(job){
  await copy(job,job.admin_id);change(job.id,'preview');
  const total=db.prepare("SELECT count(DISTINCT telegram_id) n FROM users WHERE telegram_id IS NOT NULL AND telegram_id<>''").get().n;
  await send(job.admin_id,`<b>3 · Review before sending</b>\n\nThe message above is your customer preview. Up to <b>${total}</b> registered Telegram users. Bots cannot message users who have blocked them or never started the bot.\n\nSend to everyone only when ready.`,[[{text:'Confirm · Send to all',callback_data:`bc:send:${job.id}`,style:'success',emoji:'🚀'}],[{text:'Edit buttons',callback_data:`bc:edit:${job.id}`,emoji:'✏️'},{text:'Cancel',callback_data:`bc:cancel:${job.id}`,style:'danger',emoji:'✖️'}]]);
 }
 const buttonHelp='<b>2 · Add button rows</b>\n\nOne line = one row. Use <code>||</code> (or <code>;;</code>) for two buttons in the same row.\n\n<code>My accounts | panel:fakesite/accounts | primary\nDeploy Bot | panel:deploy | success || Support | https://t.me/your_support\nVisit website | https://example.com</code>\n\nOptional fourth field: numeric custom emoji ID. Styles: primary / success / danger. Up to 8 rows, 2 buttons each. Full HTTPS URLs open exactly that destination; panel targets open a specific panel section. Send <code>-</code> for no buttons. Telegram may show ordinary emoji/styles depending on support. JSON rows with text, target, style, icon are also accepted.';
 async function message(msg){
  if(!valid(msg.chat,msg.from))return;const admin=String(msg.from.id),text=msg.text||'';
  if(/^\/broadcast(?:@\w+)?(?:\s|$)/i.test(text)){await start(admin);return;}
  if(/^\/(?:cancel|admin|start)(?:@\w+)?(?:\s|$)/i.test(text)){
   db.prepare("UPDATE bot_broadcasts SET state='cancelled' WHERE admin_id=? AND state IN ('content','buttons','preview')").run(admin);
   if(/^\/cancel/i.test(text))await send(admin,'Draft cancelled. Active deliveries can be cancelled from their Status menu.');return;
  }
  const job=db.prepare("SELECT * FROM bot_broadcasts WHERE admin_id=? AND state IN ('content','buttons') ORDER BY updated_at DESC LIMIT 1").get(admin);if(!job)return;
  if(now()-job.updated_at>30*60*1000){change(job.id,'cancelled');await send(admin,'Draft expired. Start again with /broadcast.');return;}
  if(text.startsWith('/'))return;
  if(job.state==='content'){
   if(msg.media_group_id){await send(admin,'Albums are not supported as one campaign. Send a single media item.');return;}
   if(!(msg.text||msg.photo||msg.video||msg.document||msg.animation||msg.voice||msg.audio||msg.sticker||msg.video_note)){await send(admin,'Send a supported text or media message. Service/paid messages are not supported.');return;}
   db.prepare("UPDATE bot_broadcasts SET source_chat=?,source_message=?,payload=?,state='buttons',updated_at=? WHERE id=?").run(admin,msg.message_id,JSON.stringify({text:msg.text,entities:msg.entities,caption:msg.caption,caption_entities:msg.caption_entities,captionable:Boolean(msg.photo||msg.video||msg.document||msg.animation||msg.audio||msg.voice)}),now(),job.id);
   builder(job.id,{});await ready(load(job.id,admin));return;
  }
  const wizard=JSON.parse(job.builder||'{}');
  if(wizard.step==='name'){
   if(!text.trim()||text.length>48){await send(admin,'Send a button label of 1–48 characters.');return;}
   await targetStep(job,{...wizard,text:text.trim(),icon:msg.entities?.find(e=>e.type==='custom_emoji')?.custom_emoji_id});return;
  }
  if(wizard.step==='link'){try{await colorStep(job,wizard,text.trim());}catch(e){await send(admin,esc(e.message));}return;}
  if(wizard.step==='color'){await send(admin,'Choose a color using the buttons above.');return;}
  try{const rows=parseButtons(text,getSiteUrl(),msg.entities||[]);db.prepare('UPDATE bot_broadcasts SET buttons=?,updated_at=? WHERE id=?').run(JSON.stringify(rows),now(),job.id);await preview(load(job.id,admin));}catch(e){await send(admin,`${esc(e.response?'Telegram could not preview this content. Check the source message or start again.':e.message)}\n\nSend corrected button rows or /cancel.`);}
 }
 async function callback(q){
  if(!String(q.data||'').startsWith('bc:'))return;
  if(!valid(q.message?.chat,q.from)){try{await bot.answerCallbackQuery(q.id,{text:'Private admin access only.',show_alert:true});}catch{}return;}
  try{await bot.answerCallbackQuery(q.id);}catch{}
  const admin=String(q.from.id),[,action,id]=q.data.split(':');if(action==='new'){await start(admin,true);return;}
  const job=load(id,admin);if(!job){await send(admin,'Campaign not found. Use /broadcast.');return;}
  if(action==='status'){await send(admin,status(job),controls(job));return;}
  if(action==='cancel'){change(id,'cancelled');await send(admin,status({...job,state:'cancelled'}),[[{text:'New broadcast',callback_data:'bc:new',emoji:'✨'}]]);return;}
  if(['content','buttons','preview'].includes(job.state)&&now()-job.updated_at>30*60*1000){change(id,'cancelled');await send(admin,'Draft expired. Use /broadcast.');return;}
  if(['buttons','preview'].includes(job.state)){
   if(action==='content'){builder(id,{});change(id,'content');await send(admin,'Send replacement content. Existing buttons will be retained.');return;}
   if(action==='ready'){builder(id,{});change(id,'buttons');await ready(load(id,admin));return;}
   if(action==='clear'){db.prepare("UPDATE bot_broadcasts SET buttons='[]' WHERE id=?").run(id);builder(id,{});change(id,'buttons');await ready(load(id,admin));return;}
   if(action==='view'){builder(id,{});await preview(job);return;}
   if(action==='edit'){builder(id,{});change(id,'buttons');await send(admin,buttonHelp);return;}
   if(action==='add'){builder(id,{});change(id,'buttons');await placement(job);return;}
   if(['row','same'].includes(action)){
    const rows=JSON.parse(job.buttons);if(action==='row'&&rows.length>=8||action==='same'&&rows.at(-1)?.length!==1){await send(admin,'That position is full. Clear/edit buttons or choose another position.');return;}
    builder(id,{step:'name',placement:action});change(id,'buttons');await send(admin,'<b>Send button name</b>\nYou can include a Telegram custom emoji in the label.');return;
   }
   const state=JSON.parse(job.builder||'{}');
   if(action==='target'&&state.step==='link'){await colorStep(job,state,'panel:'+q.data.split(':')[3]);return;}
   if(action==='color'&&state.step==='color'){
    const [, , ,style,nonce]=q.data.split(':');if(nonce!==state.nonce||!['primary','success','danger'].includes(style))return;
    const rows=JSON.parse(job.buttons),button={...state.pending,style};
    if(state.placement==='same'&&rows.at(-1)?.length===1)rows.at(-1).push(button);else if(rows.length<8)rows.push([button]);else return;
    db.prepare('UPDATE bot_broadcasts SET buttons=? WHERE id=?').run(JSON.stringify(rows),id);builder(id,{});change(id,'buttons');await ready(load(id,admin));return;
   }
  }
  if(action==='skip'&&job.state==='buttons'){db.prepare("UPDATE bot_broadcasts SET buttons='[]' WHERE id=?").run(id);await preview(load(id,admin));return;}
  if(action==='send'&&job.state==='preview'){
   db.transaction(()=>{
    const insert=db.prepare('INSERT OR IGNORE INTO bot_broadcast_recipients(job_id,chat_id) VALUES(?,?)');
    for(const u of db.prepare("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL").all())if(/^[1-9]\d*$/.test(String(u.telegram_id)))insert.run(id,String(u.telegram_id));
    change(id,'running');
   })();
   void run(id).catch(()=>change(id,'paused'));await send(admin,'<b>Broadcast started</b>\nDelivery is paced. Use Status for counts or Cancel to stop remaining recipients.',controls({...job,state:'running'}));return;
  }
  if(action==='resume'&&job.state==='paused'){change(id,'running');void run(id).catch(()=>change(id,'paused'));await send(admin,'Resuming pending recipients only.',controls({...job,state:'running'}));return;}
  await send(admin,'This action is no longer available. Use Status or /broadcast.');
 }
 bot.on('message',msg=>{void message(msg).catch(async()=>{if(valid(msg.chat,msg.from))await send(String(msg.from.id),'Could not complete that step. Open /broadcast to check the campaign, or /cancel and start again.').catch(()=>{});});});
 bot.on('callback_query',q=>{
  if((q.data==='ws:add'||q.data==='me:menu')&&valid(q.message?.chat,q.from))db.prepare("UPDATE bot_broadcasts SET state='cancelled' WHERE admin_id=? AND state IN ('content','buttons','preview')").run(String(q.from.id));
  void callback(q).catch(async()=>{if(valid(q.message?.chat,q.from))await send(String(q.from.id),'Action failed. Check Status before retrying; no automatic resends.').catch(()=>{});});
 });
 return {message,callback,run,counts,stop(){stopped=true;},parseButtons};
}
module.exports={register,parseButtons};
