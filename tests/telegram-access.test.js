'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('crypto'),express=require('express'),session=require('express-session');
const {gate,verifyTelegramWebAppData,launchSession,MAX_AGE_SECONDS}=require('../utils/telegram-access');
const secret='123456789:test-only-bot-secret';
function signed(extra={},token=secret){const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user:JSON.stringify({id:42,first_name:'Test'}),query_id:'test-query',...extra});const key=crypto.createHmac('sha256','WebAppData').update(token).digest();p.set('hash',crypto.createHmac('sha256',key).update([...p.keys()].sort().map(k=>`${k}=${p.get(k)}`).join('\n')).digest('hex'));return p.toString();}
test('Telegram proof rejects forgery, wrong bot, duplicate fields, future/stale dates and invalid user IDs',()=>{
 const good=signed();assert.equal(verifyTelegramWebAppData(good,secret).id,42);
 for(const proof of [good.replace('Test','Forged'),good+'&auth_date=1',good+'&hash='+'a'.repeat(64),signed({auth_date:String(Math.floor(Date.now()/1000)+100)}),signed({auth_date:String(Math.floor(Date.now()/1000)-MAX_AGE_SECONDS-1)}),signed({user:'{"id":"42"}'}),signed({user:'{"id":-1}'}),signed({user:'{}'}),'a'.repeat(17000),{},null])assert.equal(verifyTelegramWebAppData(proof,secret),null);
 assert.equal(verifyTelegramWebAppData(good,'other-bot'),null);assert.equal(verifyTelegramWebAppData(good,''),null);
});
test('customer routes need a signed launch session AND per-request proof; browser auth cannot bypass the gate',async t=>{
 const app=express();app.use(express.json());app.use(session({secret:'only-for-automated-tests-not-production',resave:false,saveUninitialized:false}));app.use(gate);
 app.get('/api/access-policy',(_req,res)=>res.json({telegram_only:true}));
 app.post('/api/auth/telegram-webapp',(req,res)=>{const u=verifyTelegramWebAppData(req.body.initData,secret);if(!u)return res.status(401).json({error:'invalid'});Object.assign(req.session,{userId:u.id,...launchSession(req.body.initData)});res.json({success:true});});
 app.post('/api/admin/login',(req,res)=>{if(req.body.password!=='test-admin')return res.sendStatus(403);req.session.isAdmin=true;res.json({success:true});});
 app.get('/api/admin/users',(req,res)=>req.session.isAdmin?res.json(['admin-data']):res.sendStatus(403));
 app.get('/api/designs',(_req,res)=>res.json(['private-catalog']));app.get('/api/settings/payment',(_req,res)=>res.json({address:'private-wallet'}));
 app.get('/api/orders/:id/download',(req,res)=>req.params.id==='1'?res.send('owned APK'):res.sendStatus(403));
 app.get('/api/files/:name',(_req,res)=>res.send('media'));app.get('/api/app-content/:id',(_req,res)=>res.send('runtime'));
 for(const p of ['/api/login','/api/register','/auth/tg','/auth/google'])app.all(p,(_req,res)=>res.json({unexpected:true}));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});t.after(()=>new Promise(r=>server.close(r)));const base=`http://127.0.0.1:${server.address().port}`;
 const request=(url,{body,headers={}}={})=>fetch(base+url,{method:body?'POST':'GET',headers:{'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 for(const url of ['/api/designs','/api/settings/payment','/api/orders/1/download','/api/files/image.png','/auth/tg','/auth/google']){const r=await request(url,{headers:{'user-agent':'Telegram Android','x-telegram-init-data':'user=42'}});assert.equal(r.status,403,url);assert.equal(r.headers.get('cache-control'),'no-store');}
 assert.equal((await request('/api/admin/users')).status,403);assert.equal((await request('/api/access-policy')).status,200);assert.equal((await request('/api/app-content/known-path')).status,200);
 assert.equal((await request('/api/auth/telegram-webapp',{body:{initData:'fake'}})).status,401);
 const proof=signed(),auth=await request('/api/auth/telegram-webapp',{body:{initData:proof}});assert.equal(auth.status,200);const cookie=auth.headers.get('set-cookie').split(';')[0];
 assert.equal((await request('/api/designs',{headers:{cookie}})).status,403,'cookie alone must not open catalog');
 const headers={cookie,'x-telegram-init-data':proof};assert.equal((await request('/api/designs',{headers})).status,200);assert.equal((await request('/api/settings/payment',{headers})).status,200);
 assert.equal((await request('/api/designs',{headers:{...headers,'x-telegram-init-data':signed({query_id:'other-launch'})}})).status,403);
 assert.equal((await request('/api/orders/1/download',{headers:{cookie}})).status,200);assert.equal((await request('/api/orders/2/download',{headers:{cookie}})).status,403,'ownership still enforced');
 for(const url of ['/api/login','/api/register'])assert.equal((await request(url,{headers,body:{username:'test'}})).status,403);
 const admin=await request('/api/admin/login',{body:{password:'test-admin'}}),adminCookie=admin.headers.get('set-cookie').split(';')[0];assert.equal((await request('/api/admin/users',{headers:{cookie:adminCookie}})).status,200);
});
test('old sessions, expired grants and arbitrary new API endpoints fail closed',()=>{
 const proof=signed();for(const s of [{userId:42},{userId:42,...launchSession(proof),miniAppExpiresAt:Date.now()-1},{userId:42,miniAppHash:'broken',miniAppExpiresAt:Date.now()+10000}]){
  let status,next=false;const res={status(n){status=n;return this;},set(){return this;},json(){return this;}};gate({path:'/api/new-service',method:'GET',session:s,get:()=>proof},res,()=>{next=true;});assert.equal(status,403);assert.equal(next,false);
 }
});
