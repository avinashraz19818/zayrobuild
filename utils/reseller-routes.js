'use strict';
const rs=require('./resellers');
module.exports=function(app,db,requireAuth,requireAdmin){
 rs.schema(db);
 const wrap=fn=>(req,res)=>{res.set('Cache-Control','no-store');try{fn(req,res);}catch(e){if(!e.public)console.error('[resellers]',e.message);res.status(e.public?400:500).json({error:e.public?e.message:'Unable to load reseller data. Please retry.'});}};
 const safe=r=>r?{status:r.status,removed_at:r.removed_at,apk_percent:r.apk_percent,bot_percent:r.bot_percent,site_percent:r.site_percent}:null;
 app.get('/api/me/reseller',requireAuth,wrap((req,res)=>{
  const p=rs.profile(db,req.session.userId);if(!p)return res.json({profile:null});
  res.json({profile:safe(p),wallet:db.prepare('SELECT coins FROM users WHERE id=?').get(req.session.userId)?.coins||0,...rs.report(db,req.session.userId,req.query.from,req.query.to)});
 }));
 app.get('/api/admin/resellers',requireAdmin,wrap((req,res)=>{
  const rows=db.prepare(`SELECT r.*,u.username,u.telegram_id,u.coins wallet,
  (SELECT count(*) FROM reseller_sales s WHERE s.user_id=r.user_id) orders,
  COALESCE((SELECT sum(s.paid_paise) FROM reseller_sales s WHERE s.user_id=r.user_id),0) charged_paise,
  COALESCE((SELECT sum(f.amount_paise) FROM reseller_refunds f JOIN reseller_sales s ON s.id=f.sale_id WHERE s.user_id=r.user_id),0) refunds_paise
  FROM resellers r LEFT JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC,r.user_id DESC`).all();
  const enrolled=rows.filter(r=>!r.removed_at);
  res.json({rows:req.query.include_removed==='1'?rows:enrolled,active:enrolled.filter(r=>r.status==='active').length,total:enrolled.length,removed:rows.length-enrolled.length,...(req.query.summary==='1'?{}:rs.report(db,null,req.query.from,req.query.to))});
 }));
 app.get('/api/admin/resellers/customers',requireAdmin,wrap((req,res)=>{
  const q=String(req.query.q||'').trim().slice(0,80);if(!q)return res.json([]);
  res.json(db.prepare(`SELECT id,username,telegram_id FROM users WHERE CAST(id AS TEXT)=? OR telegram_id=? OR username LIKE ? ESCAPE '\\' ORDER BY id DESC LIMIT 20`).all(q,q,`%${q.replace(/[\\%_]/g,'\\$&')}%`));
 }));
 app.get('/api/admin/resellers/:id',requireAdmin,wrap((req,res)=>{
  const id=Number(req.params.id),p=rs.profile(db,id);if(!p)return res.status(404).json({error:'Reseller not found.'});
  res.json({profile:p,user:db.prepare('SELECT id,username,telegram_id,coins FROM users WHERE id=?').get(id),audit:db.prepare('SELECT * FROM reseller_audit WHERE user_id=? ORDER BY id DESC LIMIT 50').all(id),...rs.report(db,id,req.query.from,req.query.to)});
 }));
 app.post('/api/admin/resellers/:id/remove',requireAdmin,wrap((req,res)=>res.json(rs.remove(db,Number(req.params.id),req.body.version,req.session.username||'admin'))));
 app.post('/api/admin/resellers/:id',requireAdmin,wrap((req,res)=>res.json(rs.save(db,Number(req.params.id),req.body,req.session.username||'admin'))));
};
