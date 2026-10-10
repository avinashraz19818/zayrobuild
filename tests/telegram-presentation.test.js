'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const style=require('../utils/telegram-presentation');
const {__test:{buildStartMessage,buildStartButtons,premiumButtonRows,buildMenuButton}}=require('../utils/telegram');
const bareEmojis=s=>/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(s.replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/g,''));
test('welcome uses native HTML bold, custom emojis, readable amounts and escaped identities',()=>{
 const text=buildStartMessage({firstName:'<b>A & B</b>',chatId:'42',userCoins:51522.7,userOrders:2});
 assert.match(text,/<b>ZAYRO BUILD<\/b>/);assert.match(text,/₹51,522.7/);assert.match(text,/APKs built · 2/);assert.match(text,/&lt;b&gt;A &amp; B&lt;\/b&gt;/);
 assert.doesNotMatch(text,/[\u{1D400}-\u{1D7FF}]|App Protection|════|━━━━/u);assert(!bareEmojis(text));assert((text.match(/<tg-emoji/g)||[]).length>=8);
});
test('HTML normalizer preserves code/pre/custom emojis/URLs but replaces serif letters and removes decorative boxes',()=>{
 const input='<b>𝐖𝐚𝐥𝐥𝐞𝐭</b> 💰 ₹𝟓𝟑\n╔════╗\n<i>Ready ✅</i> <a href="https://example.test/a?x=1&amp;y=2">Open 🚀</a> <code>𝐀_🔑</code><pre>raw ❤️</pre><tg-emoji emoji-id="123456">✨</tg-emoji>';
 const out=style.html(input);assert.match(style.plain(out),/<b>Wallet<\/b>/);assert.match(out,/₹53/);assert.match(out,/<code>𝐀_🔑<\/code>/);assert.match(out,/<pre>raw ❤️<\/pre>/);assert.match(out,/<tg-emoji emoji-id="123456">✨<\/tg-emoji>/);assert.match(out,/href="https:\/\/example.test\/a\?x=1&amp;y=2"/);assert.doesNotMatch(out,/<i>|════/);assert.equal(style.html(out),out,'idempotent HTML formatting');
});
test('all inline buttons get custom icons, bold-italic labels, no static-emoji fallback and intact destinations',()=>{
 const rows=buildStartButtons({siteUrl:'https://panel.test',supportUrl:'https://t.me/support',channelUrl:'https://t.me/channel'});
 const icons=premiumButtonRows(rows);assert(icons.flat().every(b=>b.icon_custom_emoji_id&&!bareEmojis(b.text)));assert.equal(style.plain(icons[0][0].text),'Open Builder Panel');assert.equal(icons[0][0].text,'𝙊𝙥𝙚𝙣 𝘽𝙪𝙞𝙡𝙙𝙚𝙧 𝙋𝙖𝙣𝙚𝙡');assert.match(icons[1][0].web_app.url,/tab=fakesite/);
 const fallback=premiumButtonRows(rows,{withIcons:false,withStyle:false});assert(fallback.flat().every(b=>!b.icon_custom_emoji_id&&!b.style&&!bareEmojis(b.text)));assert.equal(fallback[0][0].web_app.url,icons[0][0].web_app.url);
 const callback=premiumButtonRows([[{text:'✅ Approve',callback_data:'approve_42',emoji:'✅'}]])[0][0];assert(callback.icon_custom_emoji_id);assert.equal(callback.callback_data,'approve_42');assert.equal(style.plain(callback.text),'Approve');
});
test('menu uses only supported Telegram fields and a non-serif bold-looking label without a static emoji',()=>{
 const menu=buildMenuButton('https://panel.test');assert.deepEqual(Object.keys(menu).sort(),['text','type','web_app']);assert.equal(menu.text.normalize('NFKC'),'Open Panel');assert(!bareEmojis(menu.text));assert.equal(menu.web_app.url,'https://panel.test');
});
test('transport styles send/edit/caption calls once and protects callback payloads / literal HTML',async()=>{
 const calls=[];const bot={async sendMessage(...a){calls.push(a);return 1;},async sendDocument(...a){calls.push(a);return 2;},async editMessageText(...a){calls.push(a);return 3;},async answerCallbackQuery(...a){calls.push(a);return true;}};
 style.install(bot);style.install(bot);const markup={inline_keyboard:[[{text:'Approve',callback_data:'approve_42'}]]};
 await bot.sendMessage(1,'Hello <user> ✅',{reply_markup:markup});assert.match(style.plain(calls[0][1]),/&lt;user&gt;/);assert.match(calls[0][1],/<tg-emoji/);assert.equal(calls[0][2].parse_mode,'HTML');assert.deepEqual(calls[0][2].reply_markup,markup);
 await bot.sendDocument(1,'file.apk',{caption:'<b>Ready</b> 🚀',parse_mode:'HTML'},{filename:'a.apk'});assert.match(calls[1][2].caption,/<tg-emoji/);assert.equal(calls[1][3].filename,'a.apk');
 await bot.editMessageText('✅ Approved',{chat_id:1,message_id:5});assert.match(calls[2][0],/<tg-emoji/);assert.equal(calls[2][1].message_id,5);
 await bot.answerCallbackQuery('query42',{text:'✅ Approved',show_alert:true});assert.equal(calls[3][1].text,'Approved');assert.equal(calls[3][1].show_alert,true);
});
test('only definite message-custom-emoji rejections retry as text-only; uncertain sends never duplicate',async()=>{
 let n=0,last;const client={async sendMessage(id,text){n++;last=text;if(n===1)throw {response:{body:{error_code:400,description:'Bad Request: custom emoji invalid'}}};return 'ok';}};style.install(client);assert.equal(await client.sendMessage(1,'✅ Paid'),'ok');assert.equal(n,2);assert.doesNotMatch(last,/<tg-emoji/);assert(!bareEmojis(last));assert.match(style.plain(last),/Paid/);
 for(const code of [403,429,500,undefined]){let count=0;const c={async sendMessage(){count++;throw {response:{body:{error_code:code,description:'custom emoji unavailable'}}};}};style.install(c);await assert.rejects(c.sendMessage(1,'✅ Test'));assert.equal(count,1);}
});
test('broadcast emoji entities preserve UTF-16 offsets and existing custom emoji or literal-code spans',()=>{
 const text='✨ Update 👩‍💻 X ❤️';const custom={type:'custom_emoji',offset:0,length:1,custom_emoji_id:'123456'},code={type:'code',offset:text.indexOf('❤️'),length:2};
 const out=style.entities(text,[custom,code,{type:'bold',offset:2,length:6}]);assert.equal(out.filter(e=>e.offset===0&&e.type==='custom_emoji').length,1);assert.equal(out.find(e=>e.offset===text.indexOf('👩')).length,'👩‍💻'.length);assert(!out.some(e=>e.type==='custom_emoji'&&e.offset===code.offset));assert.deepEqual(out[0],custom);
});

test('bold italic display font preserves entities, literal links, credentials and repeated rendering',()=>{
 const out=style.html('<b>ZAYRO BUILD</b> A &amp; B https://example.com/path <code>PassWord123</code> ✅');
 assert.match(out,/𝙕𝘼𝙔𝙍𝙊 𝘽𝙐𝙄𝙇𝘿/);assert.match(out,/&amp;/);assert.match(out,/https:\/\/example.com\/path/);assert.match(out,/<code>PassWord123<\/code>/);assert.equal(style.html(out),out);assert(!bareEmojis(out));
 assert.equal(buildMenuButton('https://panel.test').text,'𝙊𝙥𝙚𝙣 𝙋𝙖𝙣𝙚𝙡');
});
