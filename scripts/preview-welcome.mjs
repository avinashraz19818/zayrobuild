// Synthetic UI preview only. No database, Telegram calls or real charges.
import {createRequire} from 'node:module';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const {createServer}=await import(require.resolve('vite'));
const plans=[30,90,180,365].map((days,i)=>({key:`days${days}`,name:`${days} Days Plan`,days,price:[1000,2500,4000,7000][i],original_price:[1500,4500,9000,18000][i],renewal_price:[500,1300,2200,4000][i],max_channels:5,enabled:true}));
let config={api_version:2,enabled:true,plans,health:{ready:true,manager_username:'demo_manager_bot'}},rows=[],coupons=[];
const sitePreview=require('../scripts/preview-sites.cjs');
const user={id:42,first_name:'Demo',username:'demo',telegram_id:'123456789',coins:10000,is_telegram:true};
function response(url,body,admin){
 const p=new URL(url,'http://preview').pathname;
 if(p==='/api/__preview_reset'){sitePreview.reset();config={api_version:2,enabled:true,plans,health:{ready:true,manager_username:'demo_manager_bot'}};rows=[];coupons=[];user.coins=10000;return {success:true};}
 const siteResponse=sitePreview.response(p,body);if(siteResponse!==undefined){if(p==='/api/site-store/purchase')user.coins=sitePreview.balance();return siteResponse;}
 if(p==='/api/access-policy')return {telegram_only:false};
 if(p==='/api/me')return admin?{isAdmin:true,username:'Demo admin'}:user;
 if(p==='/api/public-config')return {site_name:'ZAYRO DEMO',coin_rate:1,deploy_bot_enabled:true};
 if(p==='/api/announcement')return null;
 if(p==='/api/settings/payment')return {coin_rate:1};
 if(p==='/api/deploy-bot/plans')return {...config,ready:true,manager_username:'demo_manager_bot',coin_rate:1};
 if(p==='/api/deploy-bot/verify')return {id:'123456789',name:'Demo Welcome',username:'demo_welcome_bot'};
 if(p==='/api/deploy-bot/quote'){
   const plan=config.plans.find(p=>p.key===body.plan_key),price=body.renew_id?plan.renewal_price:plan.price;
   if(body.coupon&&body.coupon!=='DEMO10')return {error:'Use DEMO10 for the sample coupon.'};
   const discount=body.coupon?Math.floor(price/10):0;
   return {plan,price,discount,total:price-discount,coins:price-discount,coupon:body.coupon,coin_rate:1};
 }
 if(p==='/api/me/purchases')return [
  ...sitePreview.history(),
  ...rows.map(r=>({...r,key:`bot-${r.id}`,kind:'bot',purchase_type:r.kind,plan_name:r.plan.name})),
  {key:'apk-1',kind:'apk',id:1,app_name:'Demo APK',status:'done',created_at:'2026-10-07 08:00:00',apk_file:true,coins_spent:250},
  {key:'fake-extra-9',kind:'fake',source_kind:'extra',id:9,order_id:1,app_name:'Demo variant',status:'done',created_at:'2026-10-07 08:01:00',apk_file:true}
 ];
 if(p==='/api/me/bot-deploys'){
   if(body){const q=response('/api/deploy-bot/quote',body,false);const row={id:rows.length+1,kind:'deploy',bot_name:'Demo Welcome',bot_username:'demo_welcome_bot',admin_tg_id:body.admin_tg_id,plan:q.plan,price:q.total,coins:q.coins,status:'provisioning',created_at:new Date().toISOString()};rows.unshift(row);user.coins-=q.coins;return {success:true,request:row};}return rows;
 }
 if(p==='/api/admin/welcome-config'){if(body)config={...config,...body};return config;}
 if(p==='/api/admin/bot-deploys')return rows;
 if(p==='/api/admin/welcome-coupons'){if(body){coupons=[...coupons.filter(c=>c.code!==body.code),body];return {success:true};}return coupons;}
 if(p==='/api/admin/welcome-controls')return {bots:rows.length,running:0,users:1,subscriptions:rows.length};
 if(p==='/api/admin/dashboard')return {stats:{total_orders:0,total_users:1},recent_orders:[]};
 return [];
}
const server=await createServer({root:new URL('../frontend',import.meta.url).pathname,server:{host:'0.0.0.0',port:5173,strictPort:true,allowedHosts:true},plugins:[{name:'welcome-ui-fixtures',configureServer(s){s.middlewares.use(async(req,res,next)=>{if(!req.url.startsWith('/api/'))return next();let raw='';for await(const chunk of req)raw+=chunk;try{const data=response(req.url,raw?JSON.parse(raw):null,/\/admin/.test(req.headers.referer||''));res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));}catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.public?e.message:'Unsupported preview operation'}));}});}}]});
await server.listen();console.log('Welcome Bot demo: sample plans, simulated actions, no real credentials or payments.');server.printUrls();
