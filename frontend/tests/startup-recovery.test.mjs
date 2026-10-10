import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {timedFetch} from '../src/lib/timed-fetch.js';
test('startup recovery works without the entry module or its CSS',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 let watchdog;
 const dom=new JSDOM(html,{runScripts:'dangerously',beforeParse(w){w.setTimeout=fn=>{watchdog=fn;};}});
 try{
  const d=dom.window.document;
  assert.equal(dom.window.getComputedStyle(d.body).margin,'0px');assert.match(html,/min-height:100dvh/);
  assert.equal(d.getElementById('boot-reload').hidden,true);
  assert.equal(d.querySelector('.boot-card'),null);assert(d.querySelector('.boot-mark'));assert(d.querySelector('.boot-ring'));assert.match(d.body.textContent,/Premium APK Marketplace/);
  d.querySelector('script[type="module"]').dispatchEvent(new dom.window.Event('error'));
  assert.match(d.getElementById('boot-status').textContent,/files could not load/);assert.equal(d.getElementById('boot-reload').hidden,false);
  watchdog();assert.match(d.getElementById('boot-status').textContent,/Taking longer/);
  d.getElementById('root').innerHTML='<main>App mounted</main>';assert.doesNotThrow(watchdog);
 }finally{dom.window.close();}
});
test('timed fetch works without AbortSignal.timeout and passes response data',async()=>{
 const previous=globalThis.fetch,timeout=AbortSignal.timeout;
 try{AbortSignal.timeout=undefined;globalThis.fetch=async()=>({ok:true,text:async()=> 'ok'});assert.equal((await timedFetch('/test',{},100)).data,'ok');}
 finally{globalThis.fetch=previous;AbortSignal.timeout=timeout;}
});
test('timeout covers stalled response body and never retries a write',async()=>{
 const previous=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(_url,{signal})=>{calls++;return {text:()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))};};
  await assert.rejects(timedFetch('/test',{method:'POST'},10),/aborted/);assert.equal(calls,1);
 }finally{globalThis.fetch=previous;}
});
test('caller cancellation is preserved',async()=>{
 const previous=globalThis.fetch,controller=new AbortController();controller.abort();
 try{globalThis.fetch=async(_url,{signal})=>{assert.equal(signal.aborted,true);throw Error('aborted');};await assert.rejects(timedFetch('/test',{signal:controller.signal},100),/aborted/);}
 finally{globalThis.fetch=previous;}
});
test('public access-policy retries only an expired-cookie 401, never other failures',async()=>{
 const {loadAccessPolicy}=await import('../src/lib/access-policy.js');const previous=globalThis.fetch;
 try{
  for(const statuses of [[401,200],[401,401],[403],[500]]){
   let calls=0;globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/access-policy');assert.equal(options.method||'GET','GET');const status=statuses[calls++];return {status,ok:status===200,text:async()=>JSON.stringify(status===200?{telegram_only:true}:{error:'denied'})};};
   if(statuses.at(-1)===200)assert.equal((await loadAccessPolicy()).telegram_only,true);else await assert.rejects(loadAccessPolicy());
   assert.equal(calls,statuses.length);
  }
 }finally{globalThis.fetch=previous;}
});
test('public access-policy still fails closed for malformed configuration',async()=>{
 const {loadAccessPolicy}=await import('../src/lib/access-policy.js');const previous=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async()=>{calls++;return {status:200,ok:true,text:async()=>'{"telegram_only":"false"}'};};await assert.rejects(loadAccessPolicy(),/Invalid access policy/);assert.equal(calls,1);}finally{globalThis.fetch=previous;}
});
test('login diagnostics distinguish origin, signature and rate-limit errors without leaking exception text',async()=>{
 const {authFailure}=await import('../src/lib/auth-failure.js');
 assert.match(authFailure(403,{code:'ORIGIN_DENIED'}),/ORIGIN_DENIED/);
 assert.match(authFailure(401),/TG_AUTH_INVALID/);assert.match(authFailure(429),/15 minutes/);assert.match(authFailure(503),/not configured/);
 assert.match(authFailure(500,{request_id:'0123456789abcdef'}),/0123456789abcdef/);
 for(const status of [400,401,403,429,500,503])assert.doesNotMatch(authFailure(status,{error:'SECRET_TOKEN',request_id:'SECRET_TOKEN'}),/SECRET_TOKEN/);
});
