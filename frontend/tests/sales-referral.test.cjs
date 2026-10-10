const path=require('node:path'),assert=require('node:assert/strict');
const tools=require('node:module').createRequire(path.resolve(process.env.BROWSER_TOOLS_DIR||'../browser-tools','package.json'));
const {chromium:p}=tools('playwright-core'),c=tools('@sparticuz/chromium').default;
(async()=>{const browser=await p.launch({executablePath:await c.executablePath(),args:[...c.args.filter(a=>a!=='--single-process'),'--disable-gpu'],headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://telegram.org/**',r=>r.fulfill({body:'',contentType:'application/javascript'}));
 await page.route('**/api/admin/dashboard',r=>r.fulfill({json:{stats:{sales_today:1250,sales_total:42500,total_users:2,total_orders:3,pending_orders:0,building_orders:0},recent_orders:[]}}));
 await page.goto('http://127.0.0.1:5173/admin');await page.getByText("Today's sales (IST)",{exact:true}).waitFor();await page.getByText('₹1,250',{exact:true}).waitFor();await page.getByText('₹42,500',{exact:true}).waitFor();
 await page.goto('http://127.0.0.1:5173/?tab=refer');await page.getByText('Coming Soon',{exact:true}).first().waitFor();assert.equal(await page.getByText('Your referral link',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:/Copy link|Share link|Invite now/i}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: Today/total sales cards in INR and referral Coming Soon without invite/copy controls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
