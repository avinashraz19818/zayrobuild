const path=require('node:path');
const tools=require('node:module').createRequire(path.resolve(process.env.BROWSER_TOOLS_DIR||'../browser-tools','package.json'));
const {chromium:p}=tools('playwright-core'),c=tools('@sparticuz/chromium').default;
(async()=>{
 const browser=await p.launch({executablePath:await c.executablePath(),args:[...c.args.filter(a=>a!=='--single-process'),'--disable-gpu'],headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let external=0;
  await page.route(/https:\/\/(telegram.org|fonts.googleapis.com|fonts.gstatic.com)\//,r=>{external++;return r.abort();});
  await page.route('**/api/me',r=>r.fulfill({json:null}));
  await page.goto('http://127.0.0.1:5173/admin');
  await page.getByRole('heading',{name:'Admin Panel',exact:true}).waitFor();
  if(external)throw Error('Admin bootstrap still requires external scripts/fonts');
  await page.unroute('**/api/me');
  await page.route('**/api/admin/dashboard',r=>r.fulfill({json:{stats:{total_users:1},recent_orders:{invalid:true}}}));
  await page.reload();await page.getByRole('button',{name:'Retry overview',exact:true}).waitFor();
  await page.route('**/api/admin/welcome-config',r=>r.fulfill({json:{plans:[],enabled:true}}));
  await page.locator('.admin-burger').click();
  await page.locator('.admin-side-nav button').filter({hasText:'Deploy Bot'}).click();await page.getByRole('button',{name:/Manage Welcome Bot/}).click();
  await page.getByText('Server update incomplete:',{exact:false}).waitFor();
  await page.goto('http://127.0.0.1:5173/');
  await page.route('**/api/deploy-bot/plans',r=>r.fulfill({json:{enabled:true,plans:[{key:'starter',name:'Starter Bot',price:699,days:30}]}}));
  await page.locator('.bottomnav button').filter({hasText:'Deploy Bot'}).click();
  await page.getByText('Bot plans abhi load nahi ho paaye.',{exact:false}).waitFor();
  if((await page.locator('.welcome-store').innerText()).includes('699'))throw Error('Legacy prices are being displayed');
  await page.unroute('**/api/deploy-bot/plans');
  await page.route('**/api/deploy-bot/plans',r=>r.fulfill({json:{api_version:2,ready:false,enabled:false,plans:[]}}));
  await page.getByRole('button',{name:'Retry',exact:true}).click();
  await page.getByText('Welcome Bot ki booking abhi shuru nahi hui.',{exact:true}).waitFor();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  if(errors.length)throw Error(errors.join('\n'));
  let reauthenticated=false;
  await page.route('**/api/auth/telegram-webapp',r=>{reauthenticated=true;return r.fulfill({json:{user:{id:42,first_name:'Demo',telegram_id:'123456789',coins:10000}}});});
  const authenticated=page.waitForResponse(r=>r.url().includes('/api/auth/telegram-webapp'));
  await page.evaluate(()=>{window.Telegram={WebApp:{initData:'synthetic-late-sdk',ready(){}}};window.dispatchEvent(new Event('telegram-sdk-ready'));});
  await authenticated;
  if(!reauthenticated)throw Error('Late Telegram SDK did not resume authentication');
  const app=require('express')();
  const publicDir=path.resolve(__dirname,'../../public');
  app.get('/api/me',(req,res)=>res.json(null));
  app.use(require('express').static(publicDir));
  app.get('/admin',(req,res)=>res.sendFile(path.join(publicDir,'index.html')));
  const server=await new Promise(resolve=>{const s=app.listen(0,'0.0.0.0',()=>resolve(s));});
  try {
    const built=await browser.newPage();
    await built.route('https://**/*',r=>r.abort());
    await built.goto(`http://127.0.0.1:${server.address().port}/admin`);
    await built.getByRole('heading',{name:'Admin Panel',exact:true}).waitFor();
    await built.route('**/assets/main-*.js',r=>r.abort());
    await built.reload();
    await built.getByText('Panel load nahi hua. Connection check karke Reload dabayein.',{exact:true}).waitFor();
    await built.close();
  } finally { await new Promise(resolve=>server.close(resolve)); }
  console.log('PASS: admin login without external SDK/fonts; bad dashboard/config safe recovery; legacy plans rejected; clear unavailable state.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
