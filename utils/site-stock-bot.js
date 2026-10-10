'use strict';
const crypto=require('crypto');
// Separate from group-admin logic: credential imports only accept exact private user IDs.
function isPrivateAdmin(chat,from,ids){return chat?.type==='private'&&String(chat.id)===String(from?.id)&&String(ids||'').split(',').map(x=>x.trim()).some(x=>/^\d+$/.test(x)&&x===String(from.id));}
function register(bot,getStore,getAdminIds,{now=()=>Date.now(),sendStyled}={}){
 const sessions=new Map(),ttl=10*60*1000;
 const send=(id,text,rows)=>sendStyled?sendStyled(id,text,rows):bot.sendMessage(id,text,{disable_web_page_preview:true,...(rows?{reply_markup:{inline_keyboard:rows}}:{})});
 const answer=async(id,options)=>{try{await bot.answerCallbackQuery(id,options);}catch{ /* An expired Telegram acknowledgement must not abort the action. */ }};
 const valid=(chat,from)=>isPrivateAdmin(chat,from,getAdminIds());
 const get=id=>{const s=sessions.get(id);if(s&&s.until>now())return s;sessions.delete(id);return null;};
 async function callback(q){
  if((q.data==='bc:new'||q.data==='me:menu')&&valid(q.message?.chat,q.from))sessions.delete(String(q.from.id));
  if(!String(q.data||'').startsWith('ws:'))return;
  if(!valid(q.message?.chat,q.from)){await answer(q.id,{text:'Private admin access only.',show_alert:true});return;}
  const id=String(q.from.id);
  if(q.data.split(':')[1]==='cancel'){sessions.delete(id);await answer(q.id);await send(id,'Account import cancelled.',[[{text:'Add Accounts',callback_data:'ws:add'}]]);return;}
  const store=getStore();if(!store){await answer(q.id,{text:'Store is not ready. Try again.'});await send(id,'Store is not ready. Please try /admin again shortly.');return;}
  const parts=q.data.split(':');let s=get(id);
  if(parts[1]==='add'||(parts[1]==='list'&&(!s||s.nonce!==parts[2]))){s={nonce:crypto.randomBytes(6).toString('hex'),until:now()+ttl,productId:null};sessions.set(id,s);}
  else if(!s||s.nonce!==parts[2]){await answer(q.id,{text:'Menu expired. Open /admin → Add Accounts again.'});await send(id,'This website selection expired. Choose a website again.',[[{text:'Add Accounts',callback_data:'ws:add'}]]);return;}
  await answer(q.id);
  if(parts[1]==='add'||parts[1]==='list'){
   s.productId=null;s.until=now()+ttl;const products=store.products(true),page=Math.max(0,Number(parts[3])||0),slice=products.slice(page*20,page*20+20);
   const buttons=slice.map(p=>[{text:`${p.name.slice(0,45)}${p.enabled?'':' (hidden)'} · ${p.stock} left`,callback_data:`ws:pick:${s.nonce}:${p.id}`}]);
   const nav=[];if(page)nav.push({text:'Previous',callback_data:`ws:list:${s.nonce}:${page-1}`});if((page+1)*20<products.length)nav.push({text:'Next',callback_data:`ws:list:${s.nonce}:${page+1}`});if(nav.length)buttons.push(nav);buttons.push([{text:'Cancel',callback_data:`ws:cancel:${s.nonce}`}]);
   await send(id,products.length?'Add Accounts — choose a website:':'No websites yet. Add a website in the web admin first.',buttons);return;
  }
  if(parts[1]==='pick'){
   const p=getStore().products(true).find(p=>String(p.id)===parts[3]);if(!p){await send(id,'Website not found. Open /admin again.');return;}
   s.productId=p.id;s.until=now()+ttl;
   await send(id,`Send accounts for ${p.name}\n\nOne account per line:\n01. account-one — password-one\n02. account-two — password-two\n\nNumbering / blank lines are optional. Maximum 200 accounts per batch (Telegram message length limit also applies). No partial import: duplicates or invalid lines reject the entire batch.\n\nSelection expires in 10 minutes. /cancel to stop.`,[[{text:'Choose another website',callback_data:`ws:list:${s.nonce}:0`},{text:'Cancel',callback_data:`ws:cancel:${s.nonce}`}]]);
  }
 }
 async function message(msg){
  if(!valid(msg.chat,msg.from))return;const id=String(msg.from.id);
  if(/^\/(?:cancel|admin|start|broadcast)(?:@\w+)?(?:\s|$)/i.test(msg.text||'')){sessions.delete(id);if(/^\/cancel/i.test(msg.text))await send(id,'Account import cancelled.');return;}
  const had=sessions.has(id),s=get(id);if(!s?.productId){if(had&&!s)await send(id,'Selection expired. Open /admin → Add Accounts again.');return;}
  const productId=s.productId,nonce=s.nonce;
  if(!msg.text||msg.text.startsWith('/')){await send(id,'Send accounts as a text message, or /cancel.');return;}
  const store=getStore();if(!store){await send(id,'Store is unavailable. Try later.');return;}
  let result;
  try{result=store.addBulkStock(productId,msg.text);}catch(e){await send(id,e.public?`${e.message}\nNothing added. Fix the list and send again.`:'Could not import. Check stock before retrying.');return;}
  s.until=now()+ttl;
  // Best-effort removal of the plaintext credential message after successful storage.
  let deleted=false;try{await bot.deleteMessage(id,msg.message_id);deleted=true;}catch{}
  const p=store.products(true).find(p=>p.id===productId);
  await send(id,`Added ${result.added} accounts to ${p?.name||'website #'+productId}.\nAvailable stock: ${result.available}.\n${deleted?'Your credential message was removed from this chat.':'Please delete your original credential message from this chat.'}\nSend another batch for this website, or /cancel.`,[[{text:'Choose another website',callback_data:`ws:list:${nonce}:0`},{text:'Cancel',callback_data:`ws:cancel:${nonce}`}]]);
 }
 // Do not log incoming messages, callback payloads, or credentials on errors.
 bot.on('callback_query',q=>{void callback(q).catch(async()=>{if(valid(q.message?.chat,q.from))try{await send(String(q.from.id),'Action could not complete. Open /admin → Add Accounts and try again.');}catch{} });});
 bot.on('message',m=>{void message(m).catch(()=>{});});
 return {callback,message};
}
module.exports={register,isPrivateAdmin};
