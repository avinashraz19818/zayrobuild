// Isolated security preview. Dummy bot token, synthetic accounts, no production DB.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),front=createRequire(new URL('../frontend/package.json',import.meta.url));
const {createServer}=await import(front.resolve('vite'));
const express=require('express'),session=require('express-session');
const access=require('../utils/telegram-access');
const app=express();app.use(express.json());app.use(session({secret:'telegram-gate-test-only-not-production',resave:false,saveUninitialized:false}));app.use(access.gate);
app.get('/api/access-policy',(_req,res)=>res.json({telegram_only:true,bot_link:'https://t.me/TestAccessBot'}));
app.post('/api/auth/telegram-webapp',(req,res)=>{const user=access.verifyTelegramWebAppData(req.body.initData,'123456789:test-only-bot-secret');if(!user)return res.status(401).json({error:'Invalid signed launch'});Object.assign(req.session,{userId:user.id,...access.launchSession(req.body.initData)});res.json({success:true});});
app.get('/api/me',(req,res)=>res.json({id:req.session.userId,username:'Demo Partner',first_name:'Demo',is_telegram:true,coins:1000,telegram_id:'42'}));
app.get('/api/public-config',(_req,res)=>res.json({site_name:'VERIFIED DEMO PANEL',bot_link:'https://t.me/TestAccessBot',coin_rate:1}));
app.get('/api/announcement',(_req,res)=>res.json(null));
app.get('/api/designs',(_req,res)=>res.json([{id:1,name:'Private demo design',price_coins:999,original_price_coins:1299,fake_price_coins:299,category:'zayro',active:1}]));
app.use('/api',(_req,res)=>res.json([]));
if(process.env.PRODUCTION_PREVIEW==='1'){
 app.use(express.static(new URL('../public',import.meta.url).pathname));
 app.get('*',(_req,res)=>res.sendFile(new URL('../public/index.html',import.meta.url).pathname));
 app.listen(5180,'0.0.0.0',()=>console.log('Production-build synthetic Telegram preview on :5180 (no live accounts).'));
}else{
const server=await createServer({root:new URL('../frontend',import.meta.url).pathname,server:{host:'0.0.0.0',port:5180,strictPort:true,allowedHosts:true},plugins:[{name:'telegram-access-fixture',configureServer(s){s.middlewares.use(app);}}]});
await server.listen();console.log('Synthetic Telegram access preview only. Real bot logins will not work here.');server.printUrls();

}
