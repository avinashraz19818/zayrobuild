'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {register,isPrivateAdmin}=require('../utils/site-stock-bot');
test('bulk bot authentication is exact, private, and tied to the sender',()=>{
 assert.equal(isPrivateAdmin({type:'private',id:123},{id:123},'123,456'),true);
 assert.equal(isPrivateAdmin({type:'supergroup',id:-100123},{id:123},'123,-100123'),false);
 assert.equal(isPrivateAdmin({type:'private',id:123},{id:999},'123'),false);
 assert.equal(isPrivateAdmin({type:'private',id:123},{id:123},'-100123'),false);
});
test('bot guides website selection, atomic import, duplicate errors, cancellation, stale menus and admin revocation',async()=>{
 let time=1000,admins='123',imports=[];const messages=[],answers=[],deleted=[];
 const bot={on(){},sendMessage:async(id,text,opts)=>{messages.push({id,text,opts});},answerCallbackQuery:async(id,opts)=>answers.push(opts),deleteMessage:async(...a)=>deleted.push(a)};
 const store={products:()=>[{id:7,name:'Website A',stock:0,enabled:true},{id:8,name:'Website B',stock:1,enabled:false}],addBulkStock:(id,text)=>{if(text==='invalid'){const e=Error('Line 2: invalid.');e.public=true;throw e;}imports.push({id,text});return {added:2,available:2};}};
 const ctrl=register(bot,()=>store,()=>admins,{now:()=>time});
 const callback=data=>ctrl.callback({id:'query',data,from:{id:123},message:{chat:{id:123,type:'private'}}});
 const message=text=>ctrl.message({text,from:{id:123},chat:{id:123,type:'private'},message_id:9});
 await callback('ws:add');assert.equal(messages.at(-1).opts.reply_markup.inline_keyboard.length,3);const pick=messages.at(-1).opts.reply_markup.inline_keyboard[0][0].callback_data;
 await callback(pick);assert.match(messages.at(-1).text,/Send accounts for Website A/);
 await message('01. synthetic-user — synthetic-secret');assert.equal(imports[0].id,7);assert.match(messages.at(-1).text,/Added 2 accounts/);assert.doesNotMatch(messages.at(-1).text,/synthetic-secret/);assert.equal(deleted.length,1);
 await message('invalid');assert.match(messages.at(-1).text,/Nothing added/);assert.equal(imports.length,1);
 await message('/cancel');await message('ignored');assert.equal(imports.length,1);
 await callback(pick);assert.match(answers.at(-1).text,/expired/);
 await callback('ws:add');const pick2=messages.at(-1).opts.reply_markup.inline_keyboard[1][0].callback_data;await callback(pick2);time+=600001;await message('expired');assert.equal(imports.length,1);assert.match(messages.at(-1).text,/Selection expired/);
 await callback('ws:add');const pick3=messages.at(-1).opts.reply_markup.inline_keyboard[0][0].callback_data;await callback(pick3);admins='456';await message('no-longer-admin');assert.equal(imports.length,1);
 await callback('ws:add');assert.match(answers.at(-1).text,/Private admin/);
});
test('customer start menu never advertises admin stock import',()=>{
 const rows=require('../utils/telegram').__test.buildStartButtons({siteUrl:'https://example.test',supportUrl:'https://t.me/example',channelUrl:'https://t.me/example'});
 assert.doesNotMatch(JSON.stringify(rows),/ws:add|Add Accounts/);
});
test('cancel works after restart/timeout, without store, and despite rejected Telegram acknowledgements',async()=>{
 const sent=[];let store=null;
 const bot={on(){},answerCallbackQuery:async()=>{throw Error('Query too old');},sendMessage:async(id,text,opts)=>sent.push({text,opts})};
 const ctrl=register(bot,()=>store,()=> '123');
 const cb=data=>ctrl.callback({id:'old',data,from:{id:123},message:{chat:{id:123,type:'private'}}});
 await cb('ws:cancel:obsolete');assert.match(sent.at(-1).text,/cancelled/);
 await ctrl.message({text:'/cancel',from:{id:123},chat:{id:123,type:'private'}});assert.match(sent.at(-1).text,/cancelled/);
 store={products:()=>[{id:1,name:'Website',stock:1,enabled:true}]};
 await cb('ws:list:oldnonce:0');assert.match(sent.at(-1).text,/choose a website/);
 const pick=sent.at(-1).opts.reply_markup.inline_keyboard[0][0].callback_data;
 await cb(pick);assert.match(sent.at(-1).text,/Send accounts for Website/);
 await cb('ws:cancel:oldnonce');assert.match(sent.at(-1).text,/cancelled/);
});
