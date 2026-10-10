// Isolated synthetic preview. No real credentials, network payments or wallet credits.
import {createRequire} from 'node:module';
const rootRequire=createRequire(import.meta.url),frontendRequire=createRequire(new URL('../frontend/package.json',import.meta.url));
const {createServer}=await import(frontendRequire.resolve('vite'));
const express=rootRequire('express'),multer=rootRequire('multer'),Database=rootRequire('better-sqlite3');
const {createDeposits}=rootRequire('../utils/deposit-payments');
const db=new Database(':memory:');
db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY,coins INTEGER);INSERT INTO users VALUES(42,250);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE coin_requests(id INTEGER PRIMARY KEY,user_id INTEGER,coins_requested INTEGER,amount_paid REAL,utr TEXT,screenshot_file TEXT,status TEXT DEFAULT 'pending',approved_by TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);");
const settings={upi_id:'demo@bank',site_name:'DEMO — DO NOT PAY',usdt_trc20_address:'T'+'A'.repeat(33),usdt_bep20_address:'0x'+'a'.repeat(40),usdt_inr_rate:'92.50',usdt_bonus_percent:'3'};
for(const [k,v] of Object.entries(settings))db.prepare('INSERT INTO settings VALUES(?,?)').run(k,v);
const auto=process.env.PREVIEW_AUTO_USDT==='1';
if(auto){settings.usdt_trc20_address='T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';db.prepare("UPDATE settings SET value=? WHERE key='usdt_trc20_address'").run(settings.usdt_trc20_address);}
const deposits=createDeposits(db,{env:auto?{USDT_TRC20_AUTO:'true',USDT_BEP20_AUTO:'true',TRONGRID_API_KEY:'synthetic-not-a-key',BSC_RPC_URL:'https://rpc.invalid'}:{}}),router=express();router.use(express.json());
const user={id:42,first_name:'Demo',username:'demo',telegram_id:'123456789',coins:250,is_telegram:true};
router.post('/api/__preview_reset',(_req,res)=>{db.exec('DELETE FROM crypto_invoices;DELETE FROM crypto_credits;DELETE FROM crypto_observations;DELETE FROM crypto_notices;DELETE FROM crypto_review_details;DELETE FROM deposit_quotes;DELETE FROM coin_requests;UPDATE users SET coins=250;');res.json({success:true});});
router.get('/api/access-policy',(_req,res)=>res.json({telegram_only:false}));
router.get('/api/me',(_req,res)=>res.json({...user,coins:db.prepare('SELECT coins FROM users WHERE id=42').get().coins}));
router.get('/api/public-config',(_req,res)=>res.json({site_name:'DEMO · DO NOT PAY',coin_rate:1}));
router.get('/api/settings/payment',(_req,res)=>res.json(settings));
router.get('/api/deposits/latest',(_req,res)=>{const q=db.prepare('SELECT * FROM deposit_quotes WHERE request_id IS NULL ORDER BY created_at DESC LIMIT 1').get();res.json(q?deposits.automatic.view(q.id,42):null);});
router.get('/api/deposits/:id/status',(req,res)=>res.json(deposits.automatic.view(req.params.id,42)));
router.post('/api/__preview_auto_event',(req,res)=>{const q=db.prepare('SELECT * FROM deposit_quotes WHERE id=?').get(req.body.id),i=q&&db.prepare('SELECT * FROM crypto_invoices WHERE quote_id=?').get(q.id);if(!i)return res.status(400).json({error:'No demo invoice'});const result=deposits.automatic.observe({network:q.method,txid:rootRequire('crypto').createHash('sha256').update(q.id).digest('hex'),address:q.address,micro:i.amount_micro,time:q.created_at+1000});res.json({result});});
router.post('/api/deposits/quote',(req,res)=>{try{res.json(deposits.quote(42,req.body));}catch(e){res.status(400).json({error:e.message});}});
router.post('/api/coins/request',multer({storage:multer.memoryStorage(),limits:{fileSize:1024*1024}}).single('screenshot'),(req,res)=>{try{const r=deposits.submit(42,req.body,req.file?'demo-proof.png':'');res.json({success:true,id:r.row.id});}catch(e){res.status(400).json({error:e.message});}});
router.get('/api/me/coin-requests',(_req,res)=>res.json(db.prepare('SELECT cr.*,q.method payment_method,COALESCE(rd.received_amount,q.amount) payment_amount FROM coin_requests cr LEFT JOIN deposit_quotes q ON q.request_id=cr.id LEFT JOIN crypto_review_details rd ON rd.request_id=cr.id ORDER BY cr.id DESC').all()));
router.get('/api/announcement',(_req,res)=>res.json(null));
router.use('/api',(_req,res)=>res.json([]));
const server=await createServer({root:new URL('../frontend',import.meta.url).pathname,server:{host:'0.0.0.0',port:5173,strictPort:true,allowedHosts:true},plugins:[{name:'deposit-fixtures',configureServer(s){s.middlewares.use(router);}}]});
await server.listen();console.log('Deposit design preview — synthetic data only. DO NOT SEND FUNDS.');server.printUrls();
