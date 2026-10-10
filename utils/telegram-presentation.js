'use strict';
const IDS = {
  wave: '5413694143601842851',
  gift: '5449800250032143374',
  star: '5924870095925942277',
  fire: '5402406965252989103',
  crown: '5431505596316665041',
  diamond: '5427168083074628963',
  money: '5224257782013769471',
  check: '5336985409220001678',
  alert: '5440660757194744323',
  lock: '5296369303661067030',
  sparkles: '5463297803235113601',
  rocket: '5406966974980828470',
  bell: '5458603043203327669',
  dot: '5210708311246126137',
  down: '5192680362114830442',
  party: '5355129313878353723',
  bot: '5287684458881756303',
  stats: '5231200819986047254',
  phone: '5201990176175299013',
  arrow: '5397582299640375552',
  verified: '5206607081334906820',
  card: '5332724926216428039',
  telegram: '5364125616801073577',
  mobile: '5407025283456835913',
  trophy: '5188344996356448758',
  user: '6165860934242798778',
  gear: '5339068773301240682',
  broadcast: '5256134032852278918'
};
const segmenter=new Intl.Segmenter('en',{granularity:'grapheme'});
const emoji=s=>/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(s);
const aliases={wave:'👋',gift:'🎁',star:'⭐🌟',fire:'🔥',crown:'👑✌',diamond:'💎🌐🌍🌎🌏',money:'💰💵💸💳🤑💲💶💷',check:'✅✔🟢',alert:'‼❗❌✖⚠🚫🔴❔',lock:'🔒🔐🛡🔑',sparkles:'✨💫',rocket:'🚀🛠🔨',bell:'🔔📣📢',dot:'🔘⚪🟣🔵',down:'🔽⬇',party:'🥳🎉🎊',bot:'🤖',stats:'📊📈📉',phone:'📞☎',arrow:'👉➡→▶',verified:'☑',card:'📇📪📬📋📝📄✏',telegram:'✈',mobile:'📱',trophy:'🏆🌿🌱',user:'👤👥👨👩',gear:'⚙',broadcast:'📡'};
function iconFor(glyph=''){for(const [key,chars] of Object.entries(aliases))if([...glyph].some(c=>c!=='\ufe0f'&&chars.includes(c)))return IDS[key];return IDS.sparkles;}
function plain(value){return String(value??'').replace(/[\u{1D400}-\u{1D7FF}]/gu,c=>c.normalize('NFKC'));}
// Sans-serif bold-italic display letters; keep entities and copyable links literal.
function boldItalic(value){return plain(value).split(/(&(?:#[0-9]+|#x[0-9a-f]+|[a-z]+);|https?:\/\/[^\s<>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi).map((part,index)=>index%2?part:part.replace(/[A-Za-z]/g,c=>String.fromCodePoint(c>='a'?0x1D656+c.charCodeAt(0)-97:0x1D63C+c.charCodeAt(0)-65))).join('');}
function buttonText(value){return boldItalic([...segmenter.segment(plain(value).replace(/<[^>]*>/g,''))].map(s=>emoji(s.segment)?'':s.segment).join('').trim()||'Continue');}
function textRun(value){return [...segmenter.segment(plain(value).replace(/[─━═╔╗╚╝║╭╮╰╯┌┐└┘│]+/g,''))].map(({segment})=>emoji(segment)?`<tg-emoji emoji-id="${iconFor(segment)}">${segment}</tg-emoji>`:segment).join('');}
function html(value){
 let literal=0,custom=0,bold=0;
 return String(value??'').split(/(<[^>]*>)/g).map(token=>{
  if(token.startsWith('<')){
   const m=token.match(/^<(\/)?([\w-]+)/);if(!m)return token;const closing=!!m[1],name=m[2].toLowerCase(),delta=closing?-1:1;
   if(name==='code'||name==='pre')literal=Math.max(0,literal+delta);
   if(name==='tg-emoji')custom=Math.max(0,custom+delta);
   if(name==='b'||name==='strong')bold=Math.max(0,bold+delta);
   if(!literal&&(name==='i'||name==='em'))return ''; // Display lettering supplies italic styling; avoid double italics
   return token;
  }
  if(literal||custom||!token.trim())return token;
  const converted=textRun(token).split(/(<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>)/g).map((part,index)=>index%2?part:boldItalic(part)).join('');
  if(!converted.trim())return converted;
  return bold?converted:`<b>${converted}</b>`;
 }).join('');
}
function withoutEmojiTags(value){return String(value).replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/gi,'');}
function entities(text,list=[]){
 const result=list.map(e=>({...e}));
 for(const part of segmenter.segment(text)){
  if(!emoji(part.segment))continue;
  const start=part.index,end=start+part.segment.length;
  if(result.some(e=>['custom_emoji','code','pre'].includes(e.type)&&e.offset<end&&e.offset+e.length>start))continue;
  result.push({type:'custom_emoji',offset:start,length:part.segment.length,custom_emoji_id:iconFor(part.segment)});
 }
 return result;
}
const escape=value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const installed=Symbol('premium-presentation');
function install(client){
 if(!client||client[installed])return client;client[installed]=true;
 // Wrap actual transport clients, covering system messages, stock imports, receipts,
 // admin notices, edited messages and document/photo captions without changing targets.
 for(const [method,textIndex,optionsIndex,caption] of [['sendMessage',1,2,false],['editMessageText',0,1,false],['editMessageCaption',0,1,true],['sendPhoto',null,2,true],['sendDocument',null,2,true],['sendVideo',null,2,true],['copyMessage',null,3,true]]){
  if(typeof client[method]!=='function')continue;
  const original=client[method].bind(client);
  client[method]=async(...args)=>{
   const options={...(args[optionsIndex]||{})},field=caption?'caption':'text',entityField=caption?'caption_entities':'entities';
   let value=textIndex===null?options[field]:args[textIndex];
   if(typeof value!=='string'||!value)return original(...args);
   // Authored broadcasts retain original text and UTF-16 entity offsets.
   if(Array.isArray(options[entityField]))options[entityField]=entities(value,options[entityField]);
   else if(!options.parse_mode||options.parse_mode==='HTML'){
    value=html(options.parse_mode==='HTML'?value:escape(value));options.parse_mode='HTML';
   }else return original(...args); // Do not reinterpret arbitrary Markdown broadcasts.
   if(textIndex===null)options[field]=value;else args[textIndex]=value;args[optionsIndex]=options;
   try{return await original(...args);}catch(error){
    const body=error.response?.body,description=body?.description||'';
    // A definite text-emoji rejection is safe to retry. Never duplicate uncertain deliveries.
    if(body?.error_code!==400||/icon_custom_emoji/i.test(description)||!/custom[_ ]emoji/i.test(description))throw error;
    if(options[entityField])throw error; // preserve authored text/entities; don't silently corrupt a broadcast
    const fallback=withoutEmojiTags(value);if(fallback===value)throw error;
    if(textIndex===null)options[field]=fallback;else args[textIndex]=fallback;
    return original(...args); // text-only fallback, not static replacement emoji
   }
  };
 }
 if(typeof client.answerCallbackQuery==='function'){
  const answer=client.answerCallbackQuery.bind(client);
  client.answerCallbackQuery=(id,options={})=>answer(id,{...options,...(options.text?{text:plain(buttonText(options.text))}:{})});
 }
 return client;
}
module.exports={IDS,html,plain,boldItalic,buttonText,iconFor,entities,install,withoutEmojiTags};
