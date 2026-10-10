const path=require('node:path'),assert=require('node:assert/strict');
const tools=require('node:module').createRequire(path.resolve(process.env.BROWSER_TOOLS_DIR||'../browser-tools','package.json'));
const {chromium:p}=tools('playwright-core'),c=tools('@sparticuz/chromium').default;
(async()=>{const browser=await p.launch({executablePath:await c.executablePath(),args:[...c.args.filter(a=>a!=='--single-process'),'--disable-gpu'],headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://telegram.org/**',r=>r.fulfill({body:'',contentType:'application/javascript'}));
 const designs=[{id:1,name:'Preview Demo',price_coins:999,original_price_coins:1999,description:'Demo description '.repeat(150),preview_image:'one.png',preview_images:['one.png','two.png','three.png'],preview_video:'demo.mp4'},{id:2,name:'No Media',price_coins:100},{id:3,name:'Maintenance',price_coins:100,maintenance:1,preview_video:'demo.mp4'}];
 await page.route('**/api/designs',r=>r.fulfill({json:designs}));await page.route('**/api/files/*.png',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lqkAAAAASUVORK5CYII=','base64')}));await page.route('**/api/files/demo.mp4',r=>r.fulfill({status:404,body:'Not found'}));
 await page.request.post('http://127.0.0.1:5173/api/__preview_reset');await page.goto('http://127.0.0.1:5173/');await page.locator('.premium-wallet').waitFor();assert.equal(await page.locator('.deploy-spotlight').count(),0);assert((await page.locator('.premium-wallet').boundingBox()).height<160);
 // Verify real internal SVG motion, then the accessible static fallback.
 const motion=page.locator('.bottomnav .animated-globe');
 const before=await motion.evaluate(e=>e.getCurrentTime());
 await page.waitForTimeout(450);
 assert.notEqual(await motion.evaluate(e=>e.getCurrentTime()),before);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await motion.evaluate(e=>e.animationsPaused()),true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 const assertCompact=async()=>{
  for(const [width,height] of [[320,480],[390,600],[390,844],[740,360],[1440,900]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(350);
   for(const name of ['Cancel','Create APK']){
    const b=await page.locator('.hack-preview-actions').getByRole('button',{name,exact:true}).boundingBox();
    assert(b&&b.y>=0&&b.y+b.height<=height,`${name} outside ${width}x${height}`);
   }
   assert(await page.locator('.hack-preview-sheet').evaluate(e=>e.scrollHeight<=e.clientHeight+1),'sheet must not scroll');const sheetBox=await page.locator('.hack-preview-sheet').boundingBox();assert(sheetBox.y<=24,'preview should use the top space');assert(sheetBox.y+sheetBox.height<=height-16,'bottom actions need clearance');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:390,height:844});
 };
 const card=page.locator('.tpl-card').filter({hasText:'Preview Demo'});await card.locator('.tpl-name').click();await page.locator('.hack-preview').waitFor();assert.equal(await page.locator('.name-input').count(),0);assert.equal(await page.locator('.hack-preview-sheet').getByRole('button',{name:'Close',exact:true}).count(),0);assert.equal(await page.locator('.hack-media-slide').count(),4);await page.waitForTimeout(100);assert(await page.locator('.bottomnav .animated-globe').evaluate(e=>e.animationsPaused()),'background icon timeline must pause under a preview');await page.getByText('Preview unavailable',{exact:true}).waitFor();await assertCompact();
 await page.getByRole('button',{name:'Next preview',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hack-preview-nav span')?.textContent==='2 / 4');
 await page.locator('.hack-media-rail').evaluate(e=>e.scrollLeft=e.scrollWidth);await page.waitForFunction(()=>document.querySelector('.hack-preview-nav span')?.textContent==='4 / 4');await page.getByRole('button',{name:'Previous preview',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.hack-preview-nav span')?.textContent==='3 / 4');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('.hack-preview-actions').getByRole('button',{name:'Create APK',exact:true}).click();await page.locator('.name-input').waitFor();assert.equal(await page.locator('.hack-preview').count(),0);await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('.bottomnav button').filter({hasText:'Hacks'}).click();await page.locator('.tpl-card').filter({hasText:'No Media'}).getByRole('button',{name:'Create APK'}).click();await page.getByText('No preview uploaded for this hack yet.').waitFor();await assertCompact();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('.tpl-card').filter({hasText:'Maintenance'}).getByTitle('Preview',{exact:true}).click();assert.equal(await page.locator('.hack-preview-actions').getByRole('button',{name:'Create APK',exact:true}).isDisabled(),true);await assertCompact();await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto('http://127.0.0.1:5173/admin');await page.getByRole('button',{name:'menu',exact:true}).click();await page.getByRole('button',{name:/Fake Websites/}).first().click();await page.locator('.admin-order-card').first().waitFor();assert.match(await page.locator('.admin-selection-card').first().innerText(),/Purple/);assert.equal(await page.getByRole('button',{name:'Move Demo Purple Website up',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'Move Demo Blue Website up',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.admin-selection-card')?.textContent.includes('Blue'));
 await page.goto('http://127.0.0.1:5173/');await page.locator('.bottomnav button').filter({hasText:'Fake Website'}).click();await page.locator('.site-product').first().waitFor();assert.match(await page.locator('.site-product').first().innerText(),/Blue/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS: preview-first Home/catalog, mixed swipe gallery, missing-media fallback, maintenance guard, Create APK to wizard, saved admin ordering and storefront order.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
