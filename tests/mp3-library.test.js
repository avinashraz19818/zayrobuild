'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createMp3Library,applyMp3Library,parseName,validMp3}=require('../utils/mp3-library');
const mp3=(tag=0)=>Buffer.concat([Buffer.from([0x49,0x44,0x33,0x04,0,0,0,0,0,0]),Buffer.alloc(2000,tag)]);
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp3-lib-test-'));const assets=path.join(root,'assets');fs.mkdirSync(assets);t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,store:path.join(root,'store'),assets};}
function sampleAssets(dir){for(const name of ['intro','successful','register','bypass','lowbalance','deposit'])fs.writeFileSync(path.join(dir,name+'.mp3'),'original-'+name);}
function snapshot(dir){return Object.fromEntries(fs.readdirSync(dir).map(n=>[n,fs.readFileSync(path.join(dir,n))]));}

test('names: any sound name or amount; .mp3 suffix and case ignored; bad names rejected',()=>{
 assert.deepEqual(parseName('Deposit.MP3'),{name:'deposit',kind:'sound',amount:null});
 assert.deepEqual(parseName('200'),{name:'200',kind:'amount',amount:200});
 assert.deepEqual(parseName('200.mp3'),{name:'200',kind:'amount',amount:200});
 assert.deepEqual(parseName('new-song_2'),{name:'new-song_2',kind:'sound',amount:null});
 for(const bad of ['','  ','0','012','-5','2.5','10000001','9999999999','../x','a/b','1 2','bad name!','_x','x'.repeat(41)])
  assert.throws(()=>parseName(bad),{code:'INVALID'},bad);
});
test('only real MP3 bytes of plausible size are accepted',()=>{
 assert.equal(validMp3(mp3()),true);
 assert.equal(validMp3(Buffer.from('RIFF0000WAVE'.padEnd(2000,' '))),false);
 assert.equal(validMp3(mp3().subarray(0,500)),false);
 assert.equal(validMp3(Buffer.alloc(9*1024*1024,0xff)),false);
});
test('save, replace, list and delete any named MP3 and amount MP3, owner-only storage',t=>{
 const {store}=fixture(t);const lib=createMp3Library({root:store});
 assert.deepEqual(lib.list(),[]);
 assert.throws(()=>lib.save('bypass',Buffer.from('not audio at all')),{code:'INVALID'});
 let list=lib.save('bypass',mp3(1));assert.deepEqual(list.map(x=>x.name),['bypass']);
 list=lib.save('300',mp3(2));assert.deepEqual(list.map(x=>x.name),['300','bypass']);   // amount files first
 list=lib.save('brand-new',mp3(3));assert.deepEqual(list.map(x=>x.name),['300','brand-new','bypass']);
 assert.equal(lib.read('brand-new.mp3').equals(mp3(3)),true);
 if(process.platform!=='win32'){assert.equal(fs.statSync(lib.fileFor('300')).mode&0o777,0o600);assert.equal(fs.statSync(store).mode&0o777,0o700);}
 list=lib.save('bypass',mp3(4));assert.equal(list.filter(x=>x.name==='bypass').length,1);assert.equal(lib.read('bypass').equals(mp3(4)),true);
 list=lib.remove('brand-new');assert.deepEqual(list.map(x=>x.name),['300','bypass']);
 assert.throws(()=>lib.read('brand-new'),{code:'NOT_FOUND'});
});
test('legacy deposit-audio folder is moved to the new library folder without losing files',t=>{
 const {root}=fixture(t);const legacy=path.join(root,'deposit-audio');const store=path.join(root,'mp3-library');
 fs.mkdirSync(legacy);fs.writeFileSync(path.join(legacy,'200.mp3'),mp3(7));
 const lib=createMp3Library({root:store,legacyRoot:legacy});
 assert.deepEqual(lib.list().map(x=>x.name),['200']);assert.equal(fs.existsSync(legacy),false);
});
test('build copies every sound MP3 over the template asset and auto-detects deposit audio for minimum-deposit',t=>{
 const {store,assets}=fixture(t);const lib=createMp3Library({root:store});sampleAssets(assets);
 lib.save('200',mp3(9));lib.save('deposit',mp3(8));lib.save('extra',mp3(6));
 const before=snapshot(assets);const logs=[];
 const r=applyMp3Library({min_deposit:200},assets,s=>logs.push(s),{root:store});
 assert.equal(r.deposit.applied, true);
 assert.equal(r.deposit.amount, 200);
 assert.deepEqual(r.copied.sort(),['deposit','extra']);
 const after=snapshot(assets);
 assert.deepEqual(after['deposit.mp3'],mp3(9));           // 200.mp3 becomes deposit audio
 assert.deepEqual(after['lowbalance.mp3'],mp3(9));
 assert.deepEqual(after['extra.mp3'],mp3(6));
 assert.deepEqual(after['successful.mp3'],before['successful.mp3']); // successful is preserved
 assert.match(logs.join('\n'),/200\.mp3 → deposit\.mp3/);
});
test('custom deposit.mp3 is used when no amount file matches; original kept when nothing uploaded',t=>{
 const {store,assets}=fixture(t);const lib=createMp3Library({root:store});sampleAssets(assets);
 const logs=[];
 assert.deepEqual(applyMp3Library({min_deposit:200},assets,s=>logs.push(s),{root:store}).deposit,{applied:false,amount:200});
 assert.equal(snapshot(assets)['deposit.mp3'].toString(),'original-deposit');
 lib.save('deposit',mp3(5));
 applyMp3Library({min_deposit:200},assets,s=>logs.push(s),{root:store});
 assert.deepEqual(snapshot(assets)['deposit.mp3'],mp3(5));
 lib.save('500',mp3(4));
 const r500=applyMp3Library({min_deposit:'500'},assets,s=>logs.push(s),{root:store});
 assert.equal(r500.deposit.applied,true);
 assert.equal(r500.deposit.amount,500);
 assert.deepEqual(snapshot(assets)['deposit.mp3'],mp3(4));
});
test('admin-only routes: auth, upload with name or file name, replace, list, preview with no-store, delete',async t=>{
 const express=require('express'),multer=require('multer');const {registerMp3Library}=require('../utils/mp3-library-routes');
 const {store}=fixture(t);const lib=createMp3Library({root:store});
 const app=express();app.use(express.json());
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mp3-upload-'));t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
 registerMp3Library(app,(req,res,next)=>req.headers['x-test-admin']==='yes'?next():res.sendStatus(401),{service:lib,upload:multer({dest:tmp,limits:{fileSize:8*1024*1024,files:1}})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}/api/admin/mp3`;const h={'x-test-admin':'yes'};
 assert.equal((await fetch(base)).status,401);
 assert.equal((await fetch(base+'/200')).status,401);
 const named=new FormData();named.append('name','deposit');named.append('file',new Blob([mp3(7)],{type:'audio/mpeg'}),'whatever.mp3');
 let r=await fetch(base,{method:'POST',headers:h,body:named});assert.equal(r.status,200);assert.deepEqual((await r.json()).files.map(x=>x.name),['deposit']);
 const fromFileName=new FormData();fromFileName.append('file',new Blob([mp3(8)],{type:'audio/mpeg'}),'200.mp3');
 r=await fetch(base,{method:'POST',headers:h,body:fromFileName});assert.equal(r.status,200);assert.deepEqual((await r.json()).files.map(x=>x.name),['200','deposit']);
 const bad=new FormData();bad.append('name','notes');bad.append('file',new Blob([Buffer.from('plain text file')],{type:'text/plain'}),'notes.txt');
 r=await fetch(base,{method:'POST',headers:h,body:bad});assert.equal(r.status,400);
 const badName=new FormData();badName.append('name','bad name!');badName.append('file',new Blob([mp3(1)],{type:'audio/mpeg'}),'x.mp3');
 r=await fetch(base,{method:'POST',headers:h,body:badName});assert.equal(r.status,400);
 const noFile=new FormData();noFile.append('name','x');
 r=await fetch(base,{method:'POST',headers:h,body:noFile});assert.equal(r.status,400);
 r=await fetch(base+'/200.mp3',{headers:h});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'audio/mpeg');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(Buffer.from(await r.arrayBuffer()).equals(mp3(8)),true);
 r=await fetch(base+'/999',{headers:h});assert.equal(r.status,404);
 r=await fetch(base+'/deposit',{method:'DELETE',headers:h});assert.equal(r.status,200);assert.deepEqual((await r.json()).files.map(x=>x.name),['200']);
 assert.equal(fs.readdirSync(tmp).length,0,'temporary upload files must be removed');
});
