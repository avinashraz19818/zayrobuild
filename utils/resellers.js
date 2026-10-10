'use strict';
// New accounting snapshots use integer paise. Existing wallet remains INR.
const initialized = new WeakSet();
const fail = message => { const e = new Error(message); e.public = true; throw e; };
const cents = value => Math.round(Number(value) * 100);
function schema(db) {
  if (initialized.has(db)) return;
  db.exec(`CREATE TABLE IF NOT EXISTS resellers (
    user_id INTEGER PRIMARY KEY, status TEXT NOT NULL CHECK(status IN ('active','suspended','disabled')),
    apk_percent INTEGER NOT NULL DEFAULT 30, bot_percent INTEGER NOT NULL DEFAULT 25, site_percent INTEGER NOT NULL DEFAULT 20,
    note TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS reseller_audit(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,actor TEXT NOT NULL,before_json TEXT,after_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS reseller_sales(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,service TEXT NOT NULL,order_id INTEGER NOT NULL,
    label TEXT NOT NULL,retail_paise INTEGER NOT NULL,paid_paise INTEGER NOT NULL,percent INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(service,order_id));
    CREATE INDEX IF NOT EXISTS reseller_sales_owner ON reseller_sales(user_id,created_at);
    CREATE TABLE IF NOT EXISTS reseller_refunds(sale_id INTEGER PRIMARY KEY,amount_paise INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  if (!db.prepare('PRAGMA table_info(resellers)').all().some(c=>c.name==='removed_at')) db.exec('ALTER TABLE resellers ADD COLUMN removed_at TEXT');
  initialized.add(db);
}
function profile(db, userId) { schema(db); return db.prepare('SELECT * FROM resellers WHERE user_id=?').get(userId || -1) || null; }
function pricing(db, userId, service, retail, coupon = '') {
  const r = profile(db, userId);
  if (r?.status === 'suspended') fail('Reseller purchases are suspended. Contact admin. Your existing orders remain available.');
  const active = r?.status === 'active';
  if (active && String(coupon).trim()) fail('Reseller prices cannot be combined with coupons. Remove the coupon to continue.');
  const percent = active ? r[`${service}_percent`] : 0;
  if (!['apk','bot','site'].includes(service) || !Number.isFinite(retail) || retail < 0) fail('Invalid service price.');
  const retail_paise = cents(retail), paid_paise = Math.round(retail_paise * (100 - percent) / 100);
  return { reseller:active, percent, retail_paise, paid_paise, total:paid_paise / 100, discount:(retail_paise-paid_paise)/100 };
}
function record(db, userId, service, orderId, label, q) {
  if (!q.reseller) return;
  db.prepare('INSERT INTO reseller_sales(user_id,service,order_id,label,retail_paise,paid_paise,percent) VALUES(?,?,?,?,?,?,?)').run(userId,service,orderId,String(label).slice(0,160),q.retail_paise,q.paid_paise,q.percent);
}
function refund(db, service, orderId) {
  schema(db);
  db.prepare(`INSERT OR IGNORE INTO reseller_refunds(sale_id,amount_paise) SELECT id,paid_paise FROM reseller_sales WHERE service=? AND order_id=?`).run(service,orderId);
}
function save(db, userId, body, actor) {
  schema(db);
  return db.transaction(() => {
    if (!Number.isSafeInteger(userId) || !db.prepare('SELECT id FROM users WHERE id=?').get(userId)) fail('Customer not found. Select an existing customer.');
    if (!['active','suspended','disabled'].includes(body.status)) fail('Select a valid reseller status.');
    for (const k of ['apk_percent','bot_percent','site_percent']) {
      if (body[k] === '' || body[k] == null || !Number.isInteger(Number(body[k])) || Number(body[k]) < 0 || Number(body[k]) > 95) fail('Discounts must be whole percentages from 0 to 95.');
    }
    const old = profile(db, userId);
    if (Number(body.version || 0) !== (old?.version || 0)) fail('This reseller was updated elsewhere. Refresh before saving.');
    const note = String(body.note || '').trim(); if (note.length > 500) fail('Admin note must be 500 characters or less.');
    db.prepare(`INSERT INTO resellers(user_id,status,apk_percent,bot_percent,site_percent,note) VALUES(?,?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,apk_percent=excluded.apk_percent,bot_percent=excluded.bot_percent,site_percent=excluded.site_percent,note=excluded.note,version=resellers.version+1,removed_at=NULL,updated_at=CURRENT_TIMESTAMP`).run(userId,body.status,Number(body.apk_percent),Number(body.bot_percent),Number(body.site_percent),note);
    const next = profile(db, userId);
    db.prepare('INSERT INTO reseller_audit(user_id,actor,before_json,after_json) VALUES(?,?,?,?)').run(userId,String(actor || 'admin'),old?JSON.stringify(old):null,JSON.stringify(next));
    return next;
  })();
}
function remove(db,userId,version,actor) {
  schema(db);
  return db.transaction(()=>{
    const old=profile(db,userId);
    if(!old)fail('Reseller not found.');
    if(Number(version)!==old.version)fail('This reseller was updated elsewhere. Refresh before removing.');
    if(old.removed_at)fail('Reseller access is already removed.');
    db.prepare("UPDATE resellers SET status='disabled',removed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE user_id=?").run(userId);
    const next=profile(db,userId);
    db.prepare('INSERT INTO reseller_audit(user_id,actor,before_json,after_json) VALUES(?,?,?,?)').run(userId,String(actor||'admin'),JSON.stringify(old),JSON.stringify(next));
    return next;
  })();
}
function dates(from, to) {
  const today = new Date(Date.now()+19800000).toISOString().slice(0,10);
  from = from || today; to = to || today;
  const valid = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  if (!valid(from) || !valid(to) || from > to || Date.parse(to)-Date.parse(from)>366*86400000) fail('Select a valid date range of up to 366 days.');
  return { from,to };
}
function report(db, userId, from, to) {
  schema(db); const range=dates(from,to);
  const where=userId?'s.user_id=?':'1=1', params=userId?[userId]:[];
  const aggregate = (extra='',args=[]) => db.prepare(`SELECT count(*) orders,COALESCE(sum(s.retail_paise),0) retail_paise,COALESCE(sum(s.paid_paise),0) charged_paise,COALESCE(sum(CASE WHEN r.sale_id IS NULL THEN s.retail_paise-s.paid_paise ELSE 0 END),0) potential_margin_paise,COALESCE(sum(r.amount_paise),0) refunds_paise FROM reseller_sales s LEFT JOIN reseller_refunds r ON r.sale_id=s.id WHERE ${where} ${extra}`).get(...params,...args);
  const rows=db.prepare(`SELECT s.*,r.amount_paise refund_paise,r.created_at refunded_at FROM reseller_sales s LEFT JOIN reseller_refunds r ON r.sale_id=s.id WHERE ${where} AND date(s.created_at,'+5 hours','+30 minutes') BETWEEN ? AND ? ORDER BY s.id DESC LIMIT 500`).all(...params,range.from,range.to);
  // Cash movement days: refunds appear on refund day, not the purchase day.
  const daily=db.prepare(`SELECT day,sum(orders) orders,sum(charged_paise) charged_paise,sum(refunds_paise) refunds_paise FROM (
    SELECT date(s.created_at,'+5 hours','+30 minutes') day,count(*) orders,sum(s.paid_paise) charged_paise,0 refunds_paise FROM reseller_sales s WHERE ${where} GROUP BY day
    UNION ALL SELECT date(r.created_at,'+5 hours','+30 minutes') day,0,0,sum(r.amount_paise) FROM reseller_refunds r JOIN reseller_sales s ON s.id=r.sale_id WHERE ${where} GROUP BY day
  ) WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day DESC`).all(...params,...params,range.from,range.to);
  const deposits = userId && db.prepare("SELECT 1 FROM sqlite_master WHERE name='coin_requests'").get() ? db.prepare('SELECT id,amount_paid,coins_requested,status,created_at FROM coin_requests WHERE user_id=? ORDER BY id DESC LIMIT 100').all(userId) : [];
  const adjustments = userId && db.prepare("SELECT 1 FROM sqlite_master WHERE name='admin_coin_adjustments'").get() ? db.prepare('SELECT id,action,amount,balance_before,balance_after,created_at FROM admin_coin_adjustments WHERE user_id=? ORDER BY id DESC LIMIT 100').all(userId) : [];
  const funding = userId && db.prepare("SELECT 1 FROM sqlite_master WHERE name='coin_requests'").get() ? db.prepare("SELECT sum(CASE WHEN status='approved' THEN amount_paid ELSE 0 END) paid_inr,sum(CASE WHEN status='approved' THEN coins_requested ELSE 0 END) credited_inr,sum(CASE WHEN status='pending' THEN 1 ELSE 0 END) pending FROM coin_requests WHERE user_id=?").get(userId) : null;
  return { ...range,activity:require('./reseller-activity')(db,userId,range,dates().from),timezone:'Asia/Kolkata',lifetime:aggregate(),period:aggregate("AND date(s.created_at,'+5 hours','+30 minutes') BETWEEN ? AND ?",[range.from,range.to]),daily,orders:rows,deposits,adjustments,funding,orders_limit:500 };
}
module.exports={schema,profile,pricing,record,refund,save,remove,report,dates,cents};
