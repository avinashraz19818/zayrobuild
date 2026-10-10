const path=require('node:path'),assert=require('node:assert/strict');
const tools=require('node:module').createRequire(path.resolve(process.env.BROWSER_TOOLS_DIR||'../browser-tools','package.json'));
const {chromium:p}=tools('playwright-core'),c=tools('@sparticuz/chromium').default;
(async()=>{const browser=await p.launch({executablePath:await c.executablePath(),args:[...c.args.filter(a=>a!=='--single-process'),'--disable-gpu'],headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Generate a tiny real, playable portrait clip locally; no network assets/codecs required.
 const video=Buffer.from(await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=180;canvas.height=320;
  const ctx=canvas.getContext('2d'),stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'}),chunks=[];
  recorder.ondataavailable=e=>chunks.push(e.data);
  const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();
  const timer=setInterval(()=>{ctx.fillStyle='#7451df';ctx.fillRect(0,0,180,320);ctx.fillStyle='#ffd27a';ctx.fillRect(30,60,120,190);},80);
  await new Promise(r=>setTimeout(r,800));recorder.stop();await stopped;clearInterval(timer);stream.getTracks().forEach(t=>t.stop());
  return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
 }));
 await page.addInitScript(()=>localStorage.setItem('zayro_sfx_v1','0'));
 await page.route('https://telegram.org/**',r=>r.fulfill({body:'',contentType:'application/javascript'}));
 await page.route('**/api/designs',r=>r.fulfill({json:[{id:1,name:'Portrait media',price_coins:999,preview_video:'portrait.webm',preview_images:['landscape.svg']}]}));
 await page.route('**/api/files/portrait.webm',r=>r.fulfill({body:video,contentType:'video/webm'}));
 await page.route('**/api/files/landscape.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#8055da"/></svg>'}));
 await page.goto('http://127.0.0.1:5173/');await page.locator('.premium-wallet').waitFor();
 assert.equal(await page.evaluate(async()=>(await import('/src/lib/sfx.js')).sfxEnabled()),true,'legacy OFF must not disable default sounds');
 await page.locator('.tpl-card .tpl-name').click();
 await page.waitForFunction(()=>{const v=document.querySelector('.hack-media-slide video');return v&&!v.paused&&v.currentTime>0;});
 assert(await page.locator('video').evaluate(v=>v.muted&&v.loop&&v.playsInline));
 const portrait=await page.locator('.hack-media-slide').first().boundingBox();assert(Math.abs(portrait.width/portrait.height-180/320)<.02);
 await page.evaluate(()=>window.testVideo=document.querySelector('video'));
 await page.getByRole('button',{name:'Next preview',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.hack-preview-nav span').textContent==='2 / 2');
 assert(await page.evaluate(()=>window.testVideo.paused));
 const landscape=await page.locator('.hack-media-slide').nth(1).boundingBox();assert(Math.abs(landscape.width/landscape.height-2)<.02);
 await page.getByRole('button',{name:'Previous preview',exact:true}).click();await page.waitForFunction(()=>!window.testVideo.paused);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert(await page.evaluate(()=>window.testVideo.paused));
 assert.equal(await page.locator('.name-input').count(),0);
 await page.locator('.profile-chip').click();assert.equal(await page.getByText('Sound effects',{exact:true}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: real muted looping autoplay, inactive/closed video pause, intrinsic portrait/landscape frames, sound ON with legacy OFF, no sound toggle.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
