'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function run(command,args,options={}){return new Promise((resolve,reject)=>{const p=spawn(command,args,options);let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);p.on('error',reject);p.on('exit',code=>resolve({code,stdout,stderr}));});}
test('updater keeps private backup permissions without making new public files unreadable',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'update-mode-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 for(const d of ['scripts','bin','public','public/assets'])fs.mkdirSync(path.join(dir,d));
 for(const f of ['index.html','build-manifest.json','assets/old.js'])fs.writeFileSync(path.join(dir,'public',f),'synthetic',{mode:0o600});
 fs.copyFileSync(path.join(root,'scripts/update.sh'),path.join(dir,'scripts/update.sh'));
 fs.writeFileSync(path.join(dir,'scripts/backup-database.js'),"require('fs').writeFileSync(require('path').join(process.argv[2],'test-backup.db'),'synthetic backup')");
 fs.writeFileSync(path.join(dir,'scripts/check-panel-startup.js'),'');
 const tools={git:'exit 0',npm:"printf 'synthetic js' > public/new.js",pm2:'exit 1'};
 for(const [name,body] of Object.entries(tools))fs.writeFileSync(path.join(dir,'bin',name),`#!/bin/sh\n${body}\n`,{mode:0o755});
 const result=await run('bash',[path.join(dir,'scripts/update.sh')],{env:{...process.env,PATH:path.join(dir,'bin')+':'+process.env.PATH,ZAYRO_BACKUP_DIR:path.join(dir,'backups')}});
 assert.equal(result.code,0,result.stderr);assert.equal(fs.statSync(path.join(dir,'public/new.js')).mode&0o777,0o644,'web assets must remain readable by the serving user');
 assert.equal(fs.statSync(path.join(dir,'public/assets/old.js')).mode&0o777,0o644,'repair assets from older strict-umask updates too');
 const backupDir=path.join(dir,'backups',fs.readdirSync(path.join(dir,'backups'))[0]);assert.equal(fs.statSync(backupDir).mode&0o777,0o700);assert.equal(fs.statSync(path.join(backupDir,'test-backup.db')).mode&0o777,0o600);
});
test('startup diagnostic rejects missing/wrong-MIME lazy application chunks, not just entry failures',async t=>{
 let wrongMime=false;
 const server=http.createServer((req,res)=>{
  if(req.url==='/api/access-policy'){res.setHeader('Content-Type','application/json');res.end('{"telegram_only":true}');return;}
  if(/^\/assets\/main-.*\.js$/.test(req.url)){res.statusCode=wrongMime?200:404;res.setHeader('Content-Type','text/html');res.end('<html>not JavaScript</html>');return;}
  const name=req.url==='/'?'index.html':req.url.slice(1),file=path.join(root,'public',name);
  if(!fs.existsSync(file)){res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 for(wrongMime of [false,true]){const result=await run(process.execPath,[path.join(root,'scripts/check-panel-startup.js'),`http://127.0.0.1:${server.address().port}`]);assert.equal(result.code,1,'checker must detect a broken lazy application chunk');assert.match(result.stderr,/FAIL:/);}
});
