'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),Database=require('better-sqlite3');
const {register,parseButtons}=require('../utils/broadcast-bot');
const {panelLink,siteNotice}=require('../utils/panel-links');
const {__test:{sendWithFallback}}=require('../utils/telegram');
test('section links and website receipts never print the panel host as the purchased website',()=>{
 assert.equal(panelLink('https://panel.test/path?x=1','deploy'),'https://panel.test/path?x=1&tab=deploy#deploy');assert.equal(panelLink('javascript:bad','home'),null);
 const n=siteNotice({id:1,username:'<user>',url:'https://purchased.test/login',product_name:'MAAN & WIN',expires_at:Date.parse('2026-10-14T13:20:59.432Z')},'purchase',false,'https://private-panel.test');
 assert.match(n.text,/purchased.test\/login/);assert.doesNotMatch(n.text,/private-panel|2026-10-14T|password/);assert.match(n.text,/14 Oct 2026/);assert.match(n.text,/IST/);assert.match(n.text,/&lt;user&gt;/);assert.equal(n.replyMarkup.inline_keyboard[1][0].web_app.url,'https://private-panel.test/?tab=fakesite&section=accounts#fakesite/accounts');
});
test('advanced button layout validation preserves external paths, queries and fragments',()=>{
 const rows=parseButtons('Website | https://site.test/login?a=1#x | success ;; Deploy | panel:deploy | primary\nAccounts | panel:fakesite/accounts | danger | 123456789','https://panel.test');
 assert.equal(rows[0].length,2);assert.equal(rows[1].length,1);assert.equal(rows[0][0].url,'https://site.test/login?a=1#x');assert.equal(rows[0][1].web_app.url,'https://panel.test/?tab=deploy#deploy');assert.equal(rows[1][0].icon,'123456789');
 for(const input of ['X | javascript:alert(1)','X | https://user:pass@test.com','X | panel:admin','X | https://a.test | invalid','X | https://a.test | primary | abc','X | https://a.test ;; X | https://b.test ;; X | https://c.test','[]\nnotjson'])assert.throws(()=>parseButtons(input,'https://panel.test'));
 assert.deepEqual(parseButtons('-','https://panel.test'),[]);
});
test('premium keyboard fallback retries only definite style rejection, not delivery uncertainty',async()=>{
 for(const code of [403,429,500,undefined]){let n=0;await assert.rejects(()=>sendWithFallback(async()=>{n++;throw {response:{body:{error_code:code,description:'network error'}}};},[]));assert.equal(n,1);}
 let n=0;await sendWithFallback(async()=>{if(++n===1)throw {response:{body:{error_code:400,description:'icon_custom_emoji_id invalid'}}};return true;},[[{text:'Test',emoji:'✨',icon:'123456'}]]);assert.equal(n,2);
});
function fixture(t){
 const db=new Database(':memory:');db.exec("CREATE TABLE users(telegram_id TEXT);INSERT INTO users VALUES('11'),('22'),('11'),(''),('bad');");let admins='99',now=1000;const messages=[],copies=[],failures=new Map();
 const bot={on(){},answerCallbackQuery:async()=>{},copyMessage:async(chat,source,id,opts)=>{copies.push({chat,source,id,opts});const error=failures.get(String(chat));if(error)throw error;return {message_id:8};}};
 bot.sendMessage=async(chat,text,opts)=>{copies.push({chat,text,opts});const error=failures.get(String(chat));if(error)throw error;return {message_id:9};};
 const options={getSiteUrl:()=> 'https://panel.test',sendPremium:async(chat,text,rows)=>{messages.push({chat,text,rows});return {};},sendWithFallback:async(fn,rows)=>fn({inline_keyboard:rows}),delay:async()=>{},now:()=>now};
 const controller=register(bot,db,()=>admins,options);
 t.after(()=>{controller.stop();db.close();});
 const message=(text,extra={})=>controller.message({chat:{id:99,type:'private'},from:{id:99},message_id:7,text,...extra});
 const callback=(data,from=99)=>controller.callback({id:'cb',data,message:{chat:{id:from,type:'private'}},from:{id:from}});
 const job=()=>db.prepare('SELECT * FROM bot_broadcasts ORDER BY updated_at DESC LIMIT 1').get();
 return {db,bot,controller,options,messages,copies,failures,message,callback,job,revoke:()=>admins='',advance:()=>now+=31*60*1000};
}
const settled=async f=>{for(let i=0;i<50;i++){await new Promise(r=>setImmediate(r));if(f.job().state!=='running')return;}throw Error('worker not settled');};
test('broadcast is private-admin only, preview-first, explicit-confirm, deduplicated, and double-confirm safe',async t=>{
 const f=fixture(t);await f.controller.message({chat:{id:-99,type:'group'},from:{id:99},text:'/broadcast'});assert.equal(f.job(),undefined);
 await f.message('/broadcast');const id=f.job().id;await f.callback(`bc:send:${id}`,11);assert.equal(f.job().state,'content');
 await f.message('Premium <b>news</b>');assert.equal(f.job().state,'buttons');await f.message('Deploy | panel:deploy | success');assert.equal(f.job().state,'preview');assert.deepEqual(f.copies.map(c=>c.chat),['99']);
 await f.callback(`bc:send:${id}`);await f.callback(`bc:send:${id}`);await settled(f);assert.equal(f.job().state,'done');assert.equal(f.copies.filter(c=>c.chat==='11').length,1);assert.equal(f.copies.filter(c=>c.chat==='22').length,1);assert.equal(f.controller.counts(id).sent,2);
});
test('cancel, expired drafts, and revoked admin cannot launch deliveries',async t=>{
 const f=fixture(t);await f.message('/broadcast');await f.message('Draft');await f.message('-');let id=f.job().id;await f.callback(`bc:cancel:${id}`);await f.callback(`bc:send:${id}`);assert.equal(f.job().state,'cancelled');
 await f.message('/broadcast');await f.message('Draft');await f.message('-');id=f.job().id;f.advance();await f.callback(`bc:send:${id}`);assert.equal(f.job().state,'cancelled');
 await f.message('/broadcast');await f.message('Draft');await f.message('-');id=f.job().id;f.revoke();await f.callback(`bc:send:${id}`);assert.equal(f.job().state,'preview');assert(!f.copies.some(c=>c.chat==='11'));
});
test('blocked and uncertain failures counted without resend; restart pauses and preserves completed recipients',async t=>{
 const f=fixture(t);await f.message('/broadcast');await f.message('News');await f.message('-');const id=f.job().id;
 f.failures.set('11',{response:{body:{error_code:403}}});f.failures.set('22',new Error('timeout'));await f.callback(`bc:send:${id}`);await settled(f);assert.deepEqual(f.controller.counts(id),{blocked:1,unknown:1});
 f.db.prepare("UPDATE bot_broadcasts SET state='running' WHERE id=?").run(id);f.db.prepare("UPDATE bot_broadcast_recipients SET state='sending' WHERE chat_id='22'").run();
 const restarted=register(f.bot,f.db,()=> '99',f.options);assert.equal(f.job().state,'paused');assert.equal(restarted.counts(id).unknown,1);restarted.stop();
});
test('rate limit respects retry_after and pauses on prolonged throttling',async t=>{
 const f=fixture(t);await f.message('/broadcast');await f.message('News');await f.message('-');const id=f.job().id;
 f.failures.set('11',{response:{body:{error_code:429,parameters:{retry_after:120}}}});await f.callback(`bc:send:${id}`);await settled(f);assert.equal(f.job().state,'paused');assert.equal(f.controller.counts(id).pending,2);assert.equal(f.copies.filter(c=>c.chat==='11').length,1);
});
test('media preview keeps formatting/custom emoji offsets and adds requested keyboard rows',async t=>{
 const f=fixture(t);await f.message('/broadcast');await f.message('',{photo:[{file_id:'sample'}],caption:'Hello ✨',caption_entities:[{type:'custom_emoji',offset:6,length:1,custom_emoji_id:'123456789'}]});
 await f.message('Visit | https://purchased.test/path?q=1#login | success');
 const copy=f.copies[0];assert.equal(copy.source,'99');assert.equal(copy.id,7);assert.match(copy.opts.caption,/EXCLUSIVE UPDATE\n\nHello ✨/);assert.equal(copy.opts.caption_entities[1].offset,'✨ EXCLUSIVE UPDATE\n\n'.length+6);assert.equal(copy.opts.reply_markup.inline_keyboard[0][0].url,'https://purchased.test/path?q=1#login');
 await f.callback(`bc:cancel:${f.job().id}`);assert.equal(f.copies.length,1);
});
test('Welcome-style interactive button builder, same-row placement and stale color taps',async t=>{
 const f=fixture(t);await f.message('/broadcast');await f.message('News');const id=f.job().id;
 assert(f.messages.at(-1).rows.flat().some(b=>b.text==='Add Button'));
 await f.callback(`bc:add:${id}`);await f.callback(`bc:row:${id}`);await f.message('Fake sites');await f.callback(`bc:target:${id}:fakesite`);
 let state=JSON.parse(f.job().builder);const color=`bc:color:${id}:primary:${state.nonce}`;await f.callback(color);await f.callback(color);assert.equal(JSON.parse(f.job().buttons).flat().length,1);
 await f.callback(`bc:add:${id}`);await f.callback(`bc:same:${id}`);await f.message('Deploy');await f.message('panel:deploy');state=JSON.parse(f.job().builder);await f.callback(`bc:color:${id}:success:${state.nonce}`);
 assert.equal(JSON.parse(f.job().buttons)[0].length,2);assert.match(JSON.parse(f.job().buttons)[0][1].web_app.url,/tab=deploy/);
 await f.callback(`bc:view:${id}`);assert.equal(f.job().state,'preview');assert.equal(f.copies.length,1);
 await f.callback(`bc:clear:${id}`);assert.equal(JSON.parse(f.job().buttons).length,0);assert.equal(f.job().state,'buttons');
 const rows=parseButtons('One | panel:fakesite || Two | panel:deploy','https://panel.test');assert.equal(rows[0].length,2);
});
