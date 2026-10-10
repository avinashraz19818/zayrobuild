'use strict';
const { createService, createBridge, validatePlans } = require('./welcome-deploy');
module.exports = function registerWelcome(app, db, requireAuth, requireAdmin, limiter) {
  const { bridge, secret } = createBridge();
  const service = createService(db,bridge,secret);
  app.use(['/api/deploy-bot', '/api/me/bot-deploys', '/api/admin/welcome-config', '/api/admin/bot-deploys'], (req,res,next)=>{res.set('Cache-Control','no-store');next();});
  const wrap = fn => async (req,res) => { try { await fn(req,res); } catch(e) { res.status(e.public?400:503).json({ error:e.public?e.message:'Bot service is unavailable. Please try again later.' }); } };
  const customer = (req,res,next) => req.session.isAdmin ? res.status(403).json({ error:'Use a customer account to purchase.' }) : next();
  app.get('/api/deploy-bot/plans', wrap(async (req,res) => {
    let health = {};
    try { health = await bridge('/health'); } catch {}
    const rate = 1;
    res.json({ api_version:2, enabled:service.enabled(), ready:health.ready===true, manager_username:health.manager_username || '', coin_rate:rate, plans:service.plans().filter(p=>p.enabled) });
  }));
  app.post('/api/deploy-bot/verify', requireAuth, customer, limiter, wrap(async (req,res) => res.json(await service.verify(String(req.body.bot_token||'').trim()))));
  app.post('/api/deploy-bot/quote', requireAuth, customer, limiter, wrap(async(req,res) => {
    const { parent, ...quote } = service.quote(req.session.userId,req.body);
    res.json(quote);
  }));
  app.get('/api/me/bot-deploys', requireAuth, wrap(async(req,res) => {
    res.json(db.prepare('SELECT * FROM welcome_orders WHERE user_id=? ORDER BY id DESC LIMIT 100').all(req.session.userId || -1).map(service.safe));
  }));
  app.post('/api/me/bot-deploys', requireAuth, customer, limiter, wrap(async(req,res) => {
    const order = await service.purchase(req.session.userId,req.body);
    res.json({ success:true, request:order }); void service.tick();
  }));
  app.get('/api/admin/welcome-config',requireAdmin,wrap(async(req,res)=>{
    let health = { ready:false }; try { health = await bridge('/health'); } catch {}
    res.json({ api_version:2, enabled:service.enabled(),plans:service.plans(),health, setup: { configured:secret.length>=32, published:service.plans().filter(p=>p.enabled).length } });
  }));
  app.post('/api/admin/welcome-config',requireAdmin,wrap(async(req,res)=>{
    const plans = validatePlans(req.body.plans);
    db.transaction(()=> { service.setting('welcome_plans',JSON.stringify(plans)); service.setting('welcome_enabled',req.body.enabled?'1':'0'); })();
    res.json({ success:true });
  }));
  app.get('/api/admin/bot-deploys',requireAdmin,wrap(async(req,res)=>{
    res.json(db.prepare('SELECT w.*, u.username FROM welcome_orders w LEFT JOIN users u ON u.id=w.user_id ORDER BY w.id DESC LIMIT 200').all().map(r=>({...service.safe(r),user_id:r.user_id,username:r.username})));
  }));
  app.post('/api/admin/bot-deploys/:id/action',requireAdmin,limiter,wrap(async(req,res)=>{
    const row = db.prepare("SELECT * FROM welcome_orders WHERE id=? AND kind='deploy' AND remote_id IS NOT NULL").get(req.params.id);
    if (!row) return res.status(404).json({error:'Deployment not found or still processing.'});
    const action = req.body.action;
    if (!['start','stop','restart','info'].includes(action)) return res.status(400).json({error:'Invalid action.'});
    const result = await bridge('/action',{remote_id:row.remote_id,action});
    if (result.status) db.prepare('UPDATE welcome_orders SET status=?,expires_at=? WHERE id=?').run(result.status,result.expires_at,row.id);
    db.prepare('INSERT INTO welcome_events(order_id,event) VALUES(?,?)').run(row.id,`admin_${action}`);
    res.json(result);
  }));
  app.post('/api/admin/welcome-controls',requireAdmin,limiter,wrap(async(req,res)=>{
    if (!['summary','users','subscriptions','start_all','stop_all','check_expiry','reminders','get_defaults','save_defaults'].includes(req.body.action)) return res.status(400).json({error:'Invalid action.'});
    const result=await bridge('/controls',req.body);
    if(['reminders','check_expiry'].includes(req.body.action))await service.tick();
    res.json(result);
  }));
  app.get('/api/admin/welcome-coupons',requireAdmin,(req,res)=>res.json(db.prepare('SELECT c.*, (SELECT count(*) FROM welcome_orders WHERE coupon=c.code AND refunded=0) used FROM welcome_coupons c ORDER BY code').all()));
  app.post('/api/admin/welcome-coupons',requireAdmin,wrap(async(req,res)=>{
    const { percent,max_uses,expires_at,enabled }=req.body;
    const code=String(req.body.code||'').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !Number.isInteger(Number(percent)) || percent<1 || percent>100 || !Number.isInteger(Number(max_uses)) || max_uses<1 || max_uses>100000 || !Number.isFinite(Date.parse(expires_at))) return res.status(400).json({error:'Check coupon code, percentage, usage limit and expiry.'});
    db.prepare('INSERT INTO welcome_coupons(code,percent,max_uses,expires_at,enabled) VALUES(?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,max_uses=excluded.max_uses,expires_at=excluded.expires_at,enabled=excluded.enabled').run(code,Number(percent),Number(max_uses),new Date(expires_at).toISOString(),enabled?1:0);
    res.json({success:true});
  }));
  const timer=setInterval(()=>{ void service.tick(); },20000); timer.unref();
  void service.tick();
  return service;
};
