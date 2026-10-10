'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const express=require('express'),DB=require('better-sqlite3');
const security=require('../utils/http-security');
const {ensureTelegramUser}=require('../utils/telegram-user');
async function httpFixture(t){
 const app=express();let writes=0;
 app.use(security.headers,security.sameOriginMutation,express.json({limit:'1kb'}));
 app.post('/api/admin/change',(_req,res)=>{writes++;res.json({ok:true});});
 app.post('/api/rtdb/test/users/key',(_req,res)=>res.json({ok:true}));
 app.get('/api/failure',()=>{throw Error('SECRET_DATABASE_PATH_AND_TOKEN');});
 app.use(security.errorHandler);
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 return {url:`http://127.0.0.1:${server.address().port}`,writes:()=>writes};
}
test('cross-origin admin mutations blocked before writes; same-origin and runtime contracts preserved',async t=>{
 const f=await httpFixture(t);
 for(const headers of [{Origin:f.url.replace('http:','https:')},{Origin:'https://attacker.test'},{Origin:'null'},{'Sec-Fetch-Site':'cross-site'},{Origin:'https://127.0.0.1.attacker.test'}])assert.equal((await fetch(f.url+'/api/admin/change',{method:'POST',headers})).status,403);
 assert.equal(f.writes(),0);
 assert.equal((await fetch(f.url+'/api/admin/change',{method:'POST',headers:{Origin:f.url}})).status,200);
 assert.equal((await fetch(f.url+'/api/rtdb/test/users/key',{method:'POST',headers:{Origin:'null'}})).status,200);
 assert.equal(f.writes(),1);
});
test('parser/size/server errors return safe JSON and security headers, not HTML stacks or secrets',async t=>{
 const f=await httpFixture(t);
 for(const [path,options,status] of [['/api/failure',{},500],['/api/admin/change',{method:'POST',headers:{'Content-Type':'application/json'},body:'{oops'},400],['/api/admin/change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({x:'x'.repeat(2000)})},413]]){
  const res=await fetch(f.url+path,options);assert.equal(res.status,status);assert.equal(res.headers.get('x-content-type-options'),'nosniff');assert.match(res.headers.get('content-security-policy'),/object-src 'none'/);
  const data=await res.json();assert.match(data.request_id,/^[a-f0-9]{16}$/);assert.doesNotMatch(JSON.stringify(data),/SECRET|stack|SyntaxError/);
 }
});
function users(t){const db=new DB(':memory:');t.after(()=>db.close());db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT UNIQUE,email TEXT UNIQUE,password TEXT,auth_provider TEXT,email_verified_at INTEGER,coins INTEGER,telegram_id TEXT,first_name TEXT,tg_username TEXT,photo_url TEXT,is_telegram INTEGER)');return db;}
test('concurrent first Telegram launches reuse one identity after asynchronous hashing',async t=>{
 const db=users(t);let release;const wait=new Promise(r=>release=r);const opts={hashPassword:async()=>{await wait;return 'test-hash';},normalizeUsername:s=>s||null};
 const first=ensureTelegramUser(db,{id:42,username:'customer'},opts),second=ensureTelegramUser(db,{id:42,username:'customer'},opts);release();
 const results=await Promise.all([first,second]);assert.equal(results[0].user.id,results[1].user.id);assert.equal(results.filter(r=>r.created).length,1);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,1);
});
test('Telegram username collisions keep identities separate; failed hash creates no partial user',async t=>{
 const db=users(t),opts={hashPassword:async()=> 'test-hash',normalizeUsername:s=>s||null};
 const a=await ensureTelegramUser(db,{id:1,username:'same'},opts),b=await ensureTelegramUser(db,{id:2,username:'same'},opts);assert.notEqual(a.user.id,b.user.id);assert.equal(b.user.username,'same_1');
 await assert.rejects(ensureTelegramUser(db,{id:3},{...opts,hashPassword:async()=>{throw Error('hash failure');}}));assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,2);
});
test('Firebase rule files deny client writes and private reads with no parent grants',()=>{
 for(const file of ['../database.rules.json','../firebase.rules.json']){const r=require(file).rules;assert.equal(r['.read'],false);assert.equal(r['.write'],false);assert.deepEqual(r.$panel,{config:{'.read':true}});}
});
test('online SQLite backups include committed WAL data, stay private and never overwrite a backup',async t=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 assert.match(fs.readFileSync(path.join(__dirname,'../scripts/update.sh'),'utf8'),/runtime\/site-stock\.key/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zayro-backup-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const db=new DB(path.join(dir,'live.db'));db.pragma('journal_mode=WAL');db.pragma('wal_autocheckpoint=0');db.exec('CREATE TABLE balance(amount INTEGER);INSERT INTO balance VALUES(100)');
 const target=path.join(dir,'backup.db');
 try{
  await require('../utils/sqlite-backup').backupDatabase(db,target);
  const copy=new DB(target,{readonly:true});try{assert.equal(copy.pragma('integrity_check',{simple:true}),'ok');assert.equal(copy.prepare('SELECT amount FROM balance').get().amount,100);}finally{copy.close();}
  assert.equal(fs.statSync(target).mode&0o777,0o600);
  db.exec('UPDATE balance SET amount=200');await assert.rejects(require('../utils/sqlite-backup').backupDatabase(db,target),/EEXIST/);assert.equal(db.prepare('SELECT amount FROM balance').get().amount,200);
 }finally{db.close();}
});
test('patched sharp supports APK icon PNG/JPEG/SVG resize pipeline and rejects invalid input',async()=>{
 const sharp=require('sharp');
 const base=sharp({create:{width:24,height:24,channels:4,background:'#7357ed'}});
 const inputs=[await base.clone().png().toBuffer(),await base.clone().jpeg().toBuffer(),Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="purple"/></svg>')];
 for(const input of inputs)for(const size of [72,96,144,192]){const out=await sharp(input).resize(size,size).png().toBuffer();const meta=await sharp(out).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert.equal(meta.format,'png');}
 await assert.rejects(sharp(Buffer.from('not an image')).resize(72,72).png().toBuffer());
});
test('committed environment template contains no default authentication/signing secrets',()=>{
 const fs=require('node:fs'),path=require('node:path');const env=require('dotenv').parse(fs.readFileSync(path.join(__dirname,'../.env.example')));
 for(const key of ['SESSION_SECRET','ADMIN_PASSWORD_HASH','KEYSTORE_PASSWORD','TELEGRAM_BOT_TOKEN','FIREBASE_DATABASE_AUTH'])assert.equal(env[key]||'','',`${key} must be supplied privately`);
});
