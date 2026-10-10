'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createStore,schema}=require('./site-store');
module.exports=function(app,db,requireAuth,requireAdmin,limiter,options={}){
 schema(db);
 const file=options.keyFile||path.join(__dirname,'../runtime/site-stock.key');fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 if(!fs.existsSync(file)){if(db.prepare('SELECT count(*) n FROM site_stock').get().n)throw Error('Restore runtime/site-stock.key from backup before starting: existing account credentials need it.');try{fs.writeFileSync(file,crypto.randomBytes(32),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}}
 const store=createStore(db,fs.readFileSync(file),{notify:(...args)=>require('./telegram').sendUserNotice(...args)});
 require('./telegram').setWebsiteStore(store);
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.public?400:500).json({error:e.public?e.message:'Website store is temporarily unavailable. Please try again.'});}};
 const customer=(req,res,next)=>req.session.isAdmin?res.status(403).json({error:'Use a customer account.'}):next();
 app.use(['/api/site-store','/api/me/site-accounts','/api/admin/site-store'],(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.get('/api/site-store',wrap((req,res)=>res.json(store.products())));
 app.post('/api/site-store/quote',requireAuth,customer,limiter,wrap((req,res)=>{const {product,parent,...q}=store.quote(req.session.userId,req.body);res.json(q);}));
 app.post('/api/site-store/purchase',requireAuth,customer,limiter,wrap((req,res)=>{res.json(store.purchase(req.session.userId,req.body));void store.tick().catch(()=>{});}));
 app.get('/api/me/site-accounts',requireAuth,customer,wrap((req,res)=>res.json(store.accounts(req.session.userId))));
 app.get('/api/admin/site-store',requireAdmin,wrap((req,res)=>res.json({products:store.products(true),coupons:db.prepare('SELECT c.*,(SELECT count(*) FROM site_sales WHERE coupon=c.code) used FROM site_coupons c').all(),notifications:db.prepare('SELECT count(*) pending,sum(attempts>0) retrying FROM site_notifications WHERE sent_at IS NULL').get()})));
 app.post('/api/admin/site-store/products/:id/move',requireAdmin,limiter,wrap((req,res)=>res.json(store.moveProduct(req.params.id,req.body.direction))));
 app.post('/api/admin/site-store/products',requireAdmin,wrap((req,res)=>res.json({id:store.saveProduct(req.body)})));
 app.get('/api/admin/site-store/products/:id/stock',requireAdmin,wrap((req,res)=>res.json(store.inventory(req.params.id))));
 app.post('/api/admin/site-store/products/:id/stock',requireAdmin,limiter,wrap((req,res)=>{store.addStock(req.params.id,req.body);res.json({success:true});}));
 app.post('/api/admin/site-store/products/:id/remove-stock',requireAdmin,limiter,wrap((req,res)=>res.json(store.removeStock(req.params.id,req.body))));
 app.post('/api/admin/site-store/stock/:id/restock',requireAdmin,limiter,wrap((req,res)=>{store.restock(req.params.id,req.body);res.json({success:true});}));
 app.post('/api/admin/site-store/coupons',requireAdmin,wrap((req,res)=>{store.coupon(req.body);res.json({success:true});}));
 app.post('/api/admin/site-store/reminders',requireAdmin,limiter,wrap(async(req,res)=>{await store.tick();res.json({success:true});}));
 const run=()=>{void store.tick().catch(()=>{});void store.broadcastStock().catch(()=>{});};
 const timer=setInterval(run,60000);timer.unref();run();return store;
};
