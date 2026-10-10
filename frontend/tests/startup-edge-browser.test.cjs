// Production-bundle edge cases. Requires PRODUCTION_PREVIEW=1 preview-telegram-access.
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const tools=require('node:module').createRequire(path.resolve(process.env.BROWSER_TOOLS_DIR||'/home/user/browser-tools','package.json'));
const {chromium}=tools('playwright-core'),c=tools('@sparticuz/chromium').default;
const base='http://127.0.0.1:5180';let browser;
function proof(){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:42,first_name:'Demo'}),query_id:'edge-case'});const key=crypto.createHmac('sha256','WebAppData').update('123456789:test-only-bot-secret').digest();p.set('hash',crypto.createHmac('sha256',key).update([...p.keys()].sort().map(k=>`${k}=${p.get(k)}`).join('\n')).digest('hex'));return p.toString();}
function sdk(data){window.Telegram={WebApp:{initData:data,initDataUnsafe:{user:{id:42}},ready(){window.__telegramReadyCalls=(window.__telegramReadyCalls||0)+1;},expand(){},setHeaderColor(){},setBackgroundColor(){},disableVerticalSwipes(){}}};}
before(async()=>{browser=await chromium.launch({executablePath:await c.executablePath(),args:c.args.filter(x=>!['--single-process','--disable-web-security','--disable-site-isolation-trials','--allow-running-insecure-content'].includes(x)),headless:true});});
after(async()=>{await browser?.close();});
async function pageFor(t){const context=await browser.newContext({viewport:{width:390,height:844}});t.after(()=>context.close());await context.route('https://telegram.org/**',r=>r.fulfill({contentType:'application/javascript',body:''}));if(process.env.RECHECK_BASELINE_HTML)await context.route(base+'/**',r=>new URL(r.request().url()).pathname==='/'?r.fulfill({contentType:'text/html',body:require('node:fs').readFileSync(process.env.RECHECK_BASELINE_HTML,'utf8')}):r.continue());return context.newPage();}
test('late Telegram SDK recovers without reload or duplicate authentication',async t=>{
 const page=await pageFor(t);let auth=0;page.on('request',r=>{if(r.url().endsWith('/api/auth/telegram-webapp'))auth++;});
 await page.route('https://telegram.org/**',async r=>{await new Promise(resolve=>setTimeout(resolve,5500));await r.fulfill({contentType:'application/javascript',body:`(${sdk.toString()})(${JSON.stringify(proof())});`});});
 await page.goto(base+'/?tab=templates');await page.waitForFunction(()=>!!window.Telegram?.WebApp,{},{timeout:10000});await page.getByRole('heading',{name:'Private demo design',exact:true}).waitFor({timeout:4000});assert.equal(auth,1);assert.doesNotMatch(await page.title(),/Telegram access only/);
});
test('expired cookie response to public policy gets one safe GET retry, then signed login',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());let calls=0;
 await page.route('**/api/access-policy',r=>++calls===1?r.fulfill({status:401,json:{error:'Session expired. Please log in again.'}}):r.continue());
 await page.goto(base+'/?tab=templates');await page.getByRole('heading',{name:'Private demo design',exact:true}).waitFor({timeout:4000});assert.equal(calls,2);
});
test('missing application chunk after verified login stays a load error, not Telegram restriction',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());await page.route('**/assets/main-*.js',r=>r.abort());
 await page.goto(base+'/?tab=templates');await page.getByText('Panel files could not finish loading. Check your connection and reload.').waitFor({timeout:4000});
 assert.equal(await page.locator('.tg-access-page').count(),0);assert.equal(await page.locator('#boot-reload').isVisible(),true);assert.equal(await page.evaluate(()=>window.__verifiedMiniAppLaunch),true);
});
test('proxy login rejection displays safe origin diagnostic instead of blaming Telegram browser',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());
 await page.route('**/api/auth/telegram-webapp',r=>r.fulfill({status:403,json:{code:'ORIGIN_DENIED',error:'PRIVATE_EXCEPTION_MUST_NOT_RENDER'}}));
 await page.goto(base+'/');await page.getByRole('heading',{name:'Panel sign-in failed.'}).waitFor();await page.getByText(/ORIGIN_DENIED/).waitFor();
 assert.doesNotMatch(await page.locator('body').innerText(),/PRIVATE_EXCEPTION_MUST_NOT_RENDER|Direct browser access is restricted/);
 assert.equal(await page.locator('.app-shell').count(),0);
});

test('Telegram display-ready is sent before authentication, including rejected logins',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());let readyAtAuth=false;
 await page.route('**/api/auth/telegram-webapp',async r=>{readyAtAuth=await page.evaluate(()=>window.__telegramReadyCalls>0);await r.fulfill({status:401,json:{code:'TG_AUTH_INVALID'}});});
 await page.goto(base+'/');await page.getByText(/TG_AUTH_INVALID/).waitFor();assert.equal(readyAtAuth,true);assert.equal(await page.locator('.app-shell').count(),0);
});
test('Telegram display-ready is sent even if access policy fails',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());await page.route('**/api/access-policy',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
 await page.goto(base+'/');await page.getByText(/Access could not be checked/).waitFor();assert.equal(await page.evaluate(()=>window.__telegramReadyCalls>0),true);assert.equal(await page.locator('.app-shell').count(),0);
});
test('one logo loader survives React handoff and finishes only after panel data is ready',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());
 await page.addInitScript(()=>{
  window.__seenBootLoaders=new Set();
  new MutationObserver(()=>{document.querySelectorAll('.boot-screen').forEach(el=>window.__seenBootLoaders.add(el));}).observe(document,{childList:true,subtree:true});
 });
 const image=await require('sharp')({create:{width:80,height:80,channels:4,background:'#b79bef'}}).png().toBuffer();
 await page.route('**/brand-logo',r=>r.fulfill({contentType:'image/png',body:image}));
 let release;const hold=new Promise(r=>release=r);
 await page.route('**/api/public-config',async r=>{await hold;await r.fulfill({json:{site_name:'Demo logo brand',coin_rate:1}});});
 try{
  await page.goto(base+'/?tab=templates');await page.locator('.boot-screen[data-retained="true"]').waitFor();
  assert.equal(await page.locator('.boot-screen').count(),1);assert.equal(await page.locator('.load-mark').count(),0);
  await page.locator('.boot-mark.has-logo').waitFor();assert.equal(await page.locator('.boot-mark img').evaluate(el=>el.naturalWidth),80);
  assert.equal(await page.evaluate(()=>window.__seenBootLoaders.size),1);
  release();await page.locator('.boot-screen').waitFor({state:'detached'});await page.getByRole('heading',{name:'Private demo design',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__seenBootLoaders.size),1);assert.equal(await page.locator('.load-mark').count(),0);
 }finally{release();}
});
test('Telegram support opens the configured support contact, not the panel bot',async t=>{
 const page=await pageFor(t);await page.addInitScript(sdk,proof());
 await page.addInitScript(()=>{window.Telegram.WebApp.openTelegramLink=url=>{window.__supportOpened=url;};});
 await page.route('**/api/public-config',r=>r.fulfill({json:{support_url:'https://t.me/demo_support_contact',bot_link:'https://t.me/different_panel_bot'}}));
 await page.goto(base+'/?tab=templates');await page.locator('.boot-screen').waitFor({state:'detached'});
 const button=page.getByRole('button',{name:'Telegram support',exact:true});
 assert.equal(await button.innerText(),'');assert.equal(await button.locator('svg linearGradient').count(),2);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await button.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 if(process.env.SUPPORT_SCREENSHOT)await button.screenshot({path:process.env.SUPPORT_SCREENSHOT,animations:'disabled'});
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:844});await button.click();assert.equal(await page.evaluate(()=>window.__supportOpened),'https://t.me/demo_support_contact');
  const box=await button.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<=844);
 }
 await page.route('**/api/public-config',r=>r.fulfill({json:{support_url:''}}));await page.reload();await page.locator('.boot-screen').waitFor({state:'detached'});assert.equal(await button.count(),0);
});
