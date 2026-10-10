'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {brandLogo}=require('../utils/brand-logo');
test('public brand endpoint serves only registered image, never caller-selected uploads',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'logo-test-'));let name='logo.png',mime='image/png';fs.writeFileSync(path.join(dir,name),'logo');fs.writeFileSync(path.join(dir,'proof.png'),'PRIVATE');
 const app=express();app.get('/brand-logo',brandLogo({prepare:()=>({get:()=>({value:name})})},dir,()=>mime));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`;
 let r=await fetch(base+'/brand-logo?file=proof.png');assert.equal(r.status,200);assert.equal(await r.text(),'logo');assert.match(r.headers.get('content-security-policy'),/sandbox/);assert.equal(r.headers.get('cache-control'),'no-store');
 for(const bad of ['', '../proof.png','..','fake.png','folder\\proof.png']){name=bad;assert.equal((await fetch(base+'/brand-logo')).status,404);}
 name='logo.png';mime='text/html';assert.equal((await fetch(base+'/brand-logo')).status,404);
 assert.equal((await fetch(base+'/brand-logo/proof.png')).status,404);
});
