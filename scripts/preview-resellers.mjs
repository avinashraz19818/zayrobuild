// Isolated in-memory reseller demonstration. Never loads the production database or payment config.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),front=createRequire(new URL('../frontend/package.json',import.meta.url));
const {createServer}=await import(front.resolve('vite'));
const express=require('express'),Database=require('better-sqlite3'),rs=require('../utils/resellers');
const db=new Database(':memory:');
db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,telegram_id TEXT,coins REAL);INSERT INTO users VALUES(42,'Demo Partner','123456789',4250.75),(43,'New Partner','987654321',2000);CREATE TABLE coin_requests(id INTEGER PRIMARY KEY,user_id INTEGER,amount_paid REAL,coins_requested REAL,status TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);INSERT INTO coin_requests(id,user_id,amount_paid,coins_requested,status) VALUES(1,42,5000,5100,'approved'),(2,42,1000,1020,'pending');`);
db.exec(`CREATE TABLE orders(id INTEGER PRIMARY KEY,status TEXT,design_variant TEXT,apk_file TEXT,fake_apk_file TEXT);INSERT INTO orders VALUES(101,'done','both','demo-real.apk','demo-fake.apk');CREATE TABLE welcome_orders(id INTEGER PRIMARY KEY,kind TEXT,status TEXT,refunded INTEGER);INSERT INTO welcome_orders VALUES(102,'deploy','failed',1);CREATE TABLE site_sales(id INTEGER PRIMARY KEY,kind TEXT,lease_ids TEXT);INSERT INTO site_sales VALUES(103,'purchase','[1,2]');`);
rs.schema(db);
function seed(){
db.exec('DELETE FROM reseller_refunds;DELETE FROM reseller_sales;DELETE FROM reseller_audit;DELETE FROM resellers;');
rs.save(db,42,{status:'active',apk_percent:30,bot_percent:25,site_percent:20,note:'Synthetic demo partner',version:0},'Demo admin');
for(const [service,id,price,label] of [['apk',101,1298,'Demo APK bundle'],['bot',102,999,'Welcome Bot · 30 days'],['site',103,1199,'Demo website · 30 days']])rs.record(db,42,service,id,label,rs.pricing(db,42,service,price));
rs.refund(db,'bot',102);
}
seed();
const app=express();app.use(express.json());app.use((req,res,next)=>{req.session={isAdmin:String(req.headers.cookie||'').includes('demo_admin=1'),userId:42,username:'Demo admin'};next();});
app.post('/api/__preview_reseller_reset',(_req,res)=>{seed();res.json({success:true});});
app.get('/',(req,res,next)=>req.query.tab?next():res.redirect('/demo/customer'));
app.get('/demo/:role',(req,res)=>{const admin=req.params.role==='admin';res.setHeader('Set-Cookie',`demo_admin=${admin?1:0}; Path=/; SameSite=Lax`);res.redirect(admin?'/admin':'/?tab=reseller#reseller');});
const auth=(req,res,next)=>next(),admin=(req,res,next)=>req.session.isAdmin?next():res.status(403).json({error:'Demo admin only'});
require('../utils/reseller-routes')(app,db,auth,admin);
app.get('/api/access-policy',(_req,res)=>res.json({telegram_only:false}));
app.get('/api/me',(req,res)=>{const user=db.prepare('SELECT * FROM users WHERE id=42').get(),p=rs.profile(db,42);res.json(req.session.isAdmin?{isAdmin:true,username:'Demo admin'}:{...user,is_telegram:true,reseller:{status:p.status,apk_percent:p.apk_percent,bot_percent:p.bot_percent,site_percent:p.site_percent}});});
app.get('/api/public-config',(_req,res)=>res.json({site_name:'RESELLER DEMO · NO REAL PAYMENTS',coin_rate:1}));
app.get('/api/announcement',(_req,res)=>res.json(null));
app.get('/api/admin/dashboard',(_req,res)=>res.json({stats:{},recent_orders:[]}));
app.use('/api',(_req,res)=>res.json([]));
const server=await createServer({root:new URL('../frontend',import.meta.url).pathname,server:{host:'0.0.0.0',port:5174,strictPort:true,allowedHosts:true},plugins:[{name:'reseller-fixtures',configureServer(s){s.middlewares.use(app);}}]});
await server.listen();console.log('Synthetic reseller demo only. Customer: /demo/customer · Admin: /demo/admin. No real payments or production DB.');server.printUrls();
