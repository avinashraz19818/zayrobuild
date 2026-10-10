const {test}=require('node:test'),assert=require('node:assert/strict'),Database=require('better-sqlite3');
const {register,apply}=require('../utils/bot-message-editor');
test('message templates require private admin, preview before save, persist and reset',async t=>{
 const db=new Database(':memory:');t.after(()=>db.close());const sent=[];const bot={on(){},answerCallbackQuery:async()=>{}};
 const editor=register(bot,db,()=> '99',{getSiteUrl:()=> 'https://panel.test',sendPremium:async(id,html,rows)=>{sent.push({id,html,rows});if(html.includes('<broken>'))throw Error('Bad HTML');}});
 const cb=(data,id=99)=>editor.callback({id:'a',data,from:{id},message:{chat:{id,type:'private'}}});
 const msg=text=>editor.message({text,from:{id:99},chat:{id:99,type:'private'}});
 await cb('me:pick:welcome',10);assert.equal(sent.length,0);
 await cb('me:pick:welcome');await cb('me:text:welcome');await msg('<b>VIP</b>\n{original}');await cb('me:save:welcome');assert.equal(db.prepare('SELECT count(*) n FROM bot_message_templates').get().n,0);
 await cb('me:buttons:welcome');await msg('Websites | panel:fakesite || Deploy | panel:deploy');await cb('me:preview:welcome');await cb('me:save:welcome');
 const output=apply(db,'welcome','Hello customer',[], 'https://panel.test');assert.match(output.html,/VIP.*\nHello customer/);assert.equal(output.rows[0].length,2);assert.match(output.rows[0][0].web_app.url,/tab=fakesite/);
 await cb('me:text:welcome');await msg('<broken>');await cb('me:preview:welcome');await cb('me:save:welcome');assert.doesNotMatch(apply(db,'welcome','Original',[],'https://panel.test').html,/broken/);
 await cb('me:reset:welcome');assert.equal(apply(db,'welcome','Original',[],'https://panel.test').html,'Original');
});
test('required callbacks remain intact and purchased website button uses dynamic URL',()=>{
 const {render}=require('../utils/bot-message-editor');const out=render({html:'{original}',buttons:'Website | {website_url}'},'Receipt',[[{text:'Visit',url:'https://purchased.test/login'}],[{text:'Approve',callback_data:'approve_1'}]],'https://panel.test');assert.equal(out.rows[0][0].url,'https://purchased.test/login');assert.equal(out.rows[1][0].callback_data,'approve_1');
});
