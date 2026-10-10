'use strict';
function customerHistory(db,userId) {
  const apks=db.prepare(`SELECT o.id,o.app_name,o.status,o.created_at,o.icon_file,o.apk_file,o.fake_apk_file,o.coins_spent,o.live_link_enabled,d.name design_name
    FROM orders o LEFT JOIN designs d ON d.id=o.design_id WHERE o.user_id=?`).all(userId).map(o=>({...o,key:`apk-${o.id}`,kind:'apk',apk_file:!!o.apk_file,fake_apk_file:!!o.fake_apk_file}));
  const bots=db.prepare(`SELECT id,kind purchase_type,parent_id,bot_name,bot_username,admin_tg_id,plan_json,price,coins,status,refunded,expires_at,created_at
    FROM welcome_orders WHERE user_id=?`).all(userId).map(({plan_json,...o})=>{
      let plan={};try{plan=JSON.parse(plan_json);}catch{}
      return {...o,key:`bot-${o.id}`,kind:'bot',plan_name:plan?.name||'Welcome Bot',refunded:!!o.refunded};
    });
  const primary=db.prepare(`SELECT id,id order_id,app_name,status,created_at,fake_apk_file apk_file FROM orders
    WHERE user_id=? AND (fake_apk_file IS NOT NULL OR (fake_register_url IS NOT NULL AND fake_register_url<>''))`).all(userId).map(s=>({...s,key:`fake-primary-${s.id}`,kind:'fake',source_kind:'primary',apk_file:!!s.apk_file}));
  const extra=db.prepare(`SELECT f.id,f.order_id,o.app_name,f.status,f.created_at,f.apk_file FROM order_fake_sites f
    JOIN orders o ON o.id=f.order_id WHERE o.user_id=?`).all(userId).map(s=>({...s,key:`fake-extra-${s.id}`,kind:'fake',source_kind:'extra',apk_file:!!s.apk_file}));
  const sites=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='site_sales'").get()?db.prepare('SELECT * FROM site_sales WHERE user_id=?').all(userId).map(s=>{
    const ids=JSON.parse(s.lease_ids);const leases=ids.map(id=>db.prepare('SELECT expires_at FROM site_leases WHERE id=? AND user_id=?').get(id,userId));
    return {key:`website-${s.id}`,kind:'fake',source_kind:'account',id:s.id,app_name:s.product_name,purchase_type:s.kind,coins_spent:s.total,created_at:s.created_at,status:leases.some(l=>l?.expires_at>Date.now())?'active':'expired',lease_ids:ids};
  }):[];
  const timestamp=value=>{const s=String(value||'');return Date.parse(s.includes('T')?s:s.replace(' ','T')+'Z')||0;};
  return [...apks,...bots,...primary,...extra,...sites].sort((a,b)=>timestamp(b.created_at)-timestamp(a.created_at)||b.id-a.id||a.key.localeCompare(b.key));
}
module.exports={customerHistory};
