'use strict';
const crypto = require('crypto');
const reseller = require('./resellers');
const fs = require('fs');
const path = require('path');
const defaults = [30, 90, 180, 365].map(days => ({ key: `days${days}`, name: `${days} Days Plan`, days, price: 0, original_price: 0, renewal_price: 0, max_channels: 5, enabled: false }));
const fail = message => { const e = new Error(message); e.public = true; throw e; };
const integer = (value, min, max) => Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
function validatePlans(plans) {
  if (!Array.isArray(plans) || plans.length < 1 || plans.length > 12) fail('Add between 1 and 12 plans.');
  const keys = new Set();
  return plans.map(p => {
    if (!/^[a-z0-9_-]{1,32}$/.test(p.key) || keys.has(p.key)) fail('Each plan needs a unique key.');
    keys.add(p.key);
    if (!String(p.name || '').trim() || String(p.name).length > 60) fail('Enter a plan name (up to 60 characters).');
    for (const [field, min, max] of [['days',1,3650],['price',0,1000000],['original_price',0,1000000],['renewal_price',0,1000000],['max_channels',1,1000]]) if (!integer(p[field], min, max)) fail(`Invalid ${field}.`);
    if (p.enabled && (Number(p.price) < 1 || Number(p.renewal_price) < 1)) fail('Published plans need a purchase and renewal price.');
    return { key:p.key, name:p.name.trim(), days:Number(p.days), price:Number(p.price), original_price:Number(p.original_price), renewal_price:Number(p.renewal_price), max_channels:Number(p.max_channels), enabled:!!p.enabled };
  });
}
function createService(db, bridge, secret, notificationOptions = {}) {
  reseller.schema(db);
  db.exec(`CREATE TABLE IF NOT EXISTS welcome_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
    operation_key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL DEFAULT 'deploy', parent_id INTEGER,
    bot_id TEXT NOT NULL, bot_name TEXT NOT NULL, bot_username TEXT NOT NULL, admin_tg_id TEXT NOT NULL,
    token_cipher TEXT NOT NULL DEFAULT '', plan_json TEXT NOT NULL, price INTEGER NOT NULL, coins INTEGER NOT NULL,
    coupon TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', refunded INTEGER NOT NULL DEFAULT 0,
    remote_id TEXT, expires_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, request_key));
    CREATE INDEX IF NOT EXISTS welcome_owner ON welcome_orders(user_id,id);
    CREATE TABLE IF NOT EXISTS welcome_coupons(code TEXT PRIMARY KEY, percent INTEGER NOT NULL, max_uses INTEGER NOT NULL, expires_at TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS welcome_events(id INTEGER PRIMARY KEY, order_id INTEGER, event TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
  const getSetting = (key, fallback) => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value ?? fallback;
  const setting = (key, value) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
  const plans = () => { try { return validatePlans(JSON.parse(getSetting('welcome_plans', JSON.stringify(defaults)))); } catch { return defaults; } };
  const enabled = () => getSetting('welcome_enabled','0') === '1';
  function quote(userId, body) {
    const plan = plans().find(p => p.key === body.plan_key && p.enabled);
    if (!plan || !enabled()) fail('This plan is not available.');
    let parent = null;
    if (body.renew_id) {
      parent = db.prepare("SELECT * FROM welcome_orders WHERE id=? AND user_id=? AND kind='deploy' AND refunded=0 AND status NOT IN ('failed','pending','provisioning')").get(body.renew_id,userId);
      if (!parent) fail('Bot is not available for renewal.');
    }
    const price = parent ? plan.renewal_price : plan.price;
    const code = String(body.coupon || '').trim().toUpperCase();
    const reseller_price = reseller.pricing(db,userId,'bot',price,code);
    let discount = reseller_price.discount;
    if (code) {
      const c = db.prepare('SELECT * FROM welcome_coupons WHERE code=?').get(code);
      if (!c || !c.enabled || Date.parse(c.expires_at) <= Date.now()) fail('Coupon is invalid or expired.');
      const used = db.prepare("SELECT count(*) n FROM welcome_orders WHERE coupon=? AND refunded=0").get(code).n;
      if (used >= c.max_uses) fail('Coupon usage limit reached.');
      if (db.prepare('SELECT 1 FROM welcome_orders WHERE coupon=? AND user_id=? AND refunded=0').get(code,userId)) fail('You have already used this coupon.');
      discount = Math.floor(price * c.percent / 100);
    }
    const rate = 1; // Ledger amounts are direct INR; legacy column names remain for refunds.
    return { plan, parent, price, discount, total:Math.round((price-discount)*100)/100, coins:Math.round((price-discount)*100)/100, coin_rate:rate, coupon:code, reseller_price };
  }
  function seal(token) {
    if (!secret || secret.length < 32) fail('Deployment service is not configured.');
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm',crypto.createHash('sha256').update(secret).digest(),iv);
    const data = Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
    return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.');
  }
  function unseal(value) {
    const [iv,tag,data] = value.split('.').map(x=>Buffer.from(x,'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm',crypto.createHash('sha256').update(secret).digest(),iv);
    decipher.setAuthTag(tag); return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
  }
  const safe = row => ({ id:row.id, kind:row.kind, parent_id:row.parent_id, bot_name:row.bot_name, bot_username:row.bot_username, admin_tg_id:row.admin_tg_id, plan:JSON.parse(row.plan_json), price:row.price, coins:row.coins, status:row.status, refunded:!!row.refunded, expires_at:row.expires_at, created_at:row.created_at });
  async function verify(token) {
    if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) fail('Enter a valid BotFather token.');
    const panelToken = getSetting('telegram_bot_token',process.env.TELEGRAM_BOT_TOKEN || '');
    if (token === panelToken) fail('Use a new bot, not the store bot.');
    const health = await bridge('/health');
    if (!health.ready) fail('Welcome Bot is temporarily unavailable. Please try later.');
    return bridge('/verify', { token });
  }
  async function purchase(userId, body) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(body.request_key || '')) fail('Please reload the form and try again.');
    const existing = db.prepare('SELECT * FROM welcome_orders WHERE user_id=? AND request_key=?').get(userId,body.request_key);
    if (existing) return safe(existing);
    const q = quote(userId,body);
    const adminId = q.parent?.admin_tg_id || String(body.admin_tg_id || '').trim();
    if (!/^[1-9]\d{4,15}$/.test(adminId) || !Number.isSafeInteger(Number(adminId))) fail('Enter a valid numeric Telegram ID.');
    const token = String(body.bot_token || '').trim();
    const verified = q.parent ? { id:q.parent.bot_id, name:q.parent.bot_name, username:q.parent.bot_username } : await verify(token);
    if (q.parent && !(await bridge('/health')).ready) fail('Welcome Bot is temporarily unavailable. Please try later.');
    return db.transaction(() => {
      const again = db.prepare('SELECT * FROM welcome_orders WHERE user_id=? AND request_key=?').get(userId,body.request_key);
      if (again) return safe(again);
      const current = quote(userId,body);
      if (Number(body.expected_coins) !== current.coins) fail('Price changed. Review the total and purchase again.');
      if (!q.parent && db.prepare("SELECT 1 FROM welcome_orders WHERE bot_id=? AND kind='deploy' AND refunded=0").get(String(verified.id))) fail('This bot already has a deployment. Renew the existing bot instead.');
      if (q.parent && db.prepare("SELECT 1 FROM welcome_orders WHERE parent_id=? AND status IN ('pending','provisioning')").get(q.parent.id)) fail('A renewal is already in progress.');
      const changed = db.prepare('UPDATE users SET coins=ROUND(coins-?,2) WHERE id=? AND coins>=?').run(current.coins,userId,current.coins);
      if (!changed.changes) fail('Not enough wallet balance. Add funds to your wallet.');
      const result = db.prepare(`INSERT INTO welcome_orders(user_id,request_key,operation_key,kind,parent_id,bot_id,bot_name,bot_username,admin_tg_id,token_cipher,plan_json,price,coins,coupon)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(userId,body.request_key,crypto.randomUUID(),q.parent?'renew':'deploy',q.parent?.id||null,String(verified.id),verified.name,verified.username,adminId,q.parent?'':seal(token),JSON.stringify(current.plan),current.total,current.coins,current.coupon);
      reseller.record(db,userId,'bot',result.lastInsertRowid,`${q.parent?'Renew':'Deploy'} · ${current.plan.name}`,current.reseller_price);
      db.prepare('INSERT INTO welcome_events(order_id,event) VALUES(?,?)').run(result.lastInsertRowid,'wallet_debit');
      return safe(db.prepare('SELECT * FROM welcome_orders WHERE id=?').get(result.lastInsertRowid));
    })();
  }
  function settle(id, result) {
    return db.transaction(() => {
      const row = db.prepare('SELECT * FROM welcome_orders WHERE id=?').get(id);
      if (!row || !['pending','provisioning'].includes(row.status)) return;
      if (result.status === 'failed') {
        if (!row.refunded) db.prepare('UPDATE users SET coins=ROUND(coins+?,2) WHERE id=?').run(row.coins,row.user_id);
        db.prepare("UPDATE welcome_orders SET status='failed',refunded=1,token_cipher='' WHERE id=?").run(id);
        reseller.refund(db,'bot',id);
        db.prepare('INSERT INTO welcome_events(order_id,event) VALUES(?,?)').run(id,'wallet_refund');
      } else if (result.status === 'active') {
        db.prepare("UPDATE welcome_orders SET status='active',remote_id=?,expires_at=?,token_cipher='' WHERE id=?").run(result.remote_id,result.expires_at,id);
        if (row.parent_id) db.prepare("UPDATE welcome_orders SET status='active',expires_at=?,plan_json=? WHERE id=?").run(result.expires_at,row.plan_json,row.parent_id);
        db.prepare('INSERT INTO welcome_events(order_id,event) VALUES(?,?)').run(id,'deployment_confirmed');
      }
    })();
  }
  const notifications=require('./welcome-notifications').createNotifications(db,notificationOptions);
  let running = false;
  async function tick() {
    if (running || !secret) return;
    running = true;
    try {
      for (const row of db.prepare("SELECT * FROM welcome_orders WHERE status IN ('pending','provisioning') ORDER BY id LIMIT 5").all()) {
        try {
          db.prepare("UPDATE welcome_orders SET status='provisioning' WHERE id=? AND status='pending'").run(row.id);
          const parent = row.parent_id && db.prepare('SELECT remote_id FROM welcome_orders WHERE id=?').get(row.parent_id);
          const result = await bridge('/deploy', { operation_key:row.operation_key, kind:row.kind, remote_id:parent?.remote_id, token:row.token_cipher?unseal(row.token_cipher):undefined, owner_id:row.admin_tg_id, plan:JSON.parse(row.plan_json) });
          settle(row.id,result);
        } catch { console.warn(`[welcome] Order #${row.id} awaits runtime confirmation; retrying without another charge.`); /* Never refund ambiguous results. */ }
      }
      try {
        const fleet = await bridge('/fleet');
        for (const bot of fleet.bots || []) {
          if (['active','stopped','expired'].includes(bot.status)) db.prepare("UPDATE welcome_orders SET status=?,expires_at=? WHERE remote_id=? AND kind='deploy' AND refunded=0 AND status NOT IN ('pending','provisioning')").run(bot.status,bot.expires_at,bot.remote_id);
        }
        await notifications.tick(fleet);
      } catch { /* Keep last confirmed status while runtime is unreachable. */ }
    } finally { running = false; }
  }
  return { plans, enabled, setting, quote, safe, purchase, verify, settle, tick };
}
function createBridge() {
  let secret = process.env.WELCOME_BRIDGE_KEY || '';
  try { if (!secret) secret = fs.readFileSync(path.join(__dirname,'../runtime/welcome-bridge.key'),'utf8').trim(); } catch {}
  const base = process.env.WELCOME_BRIDGE_URL || 'http://127.0.0.1:8787';
  const url = new URL(base);
  if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Welcome bridge must use loopback HTTP');
  const bridge = async (route, body) => {
    if (secret.length < 32) fail('Welcome Bot setup is pending. Please try later.');
    const response = await fetch(base+route,{ method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${secret}`}, body:JSON.stringify(body || {}), signal:AbortSignal.timeout(route === '/health' ? 5000 : 90000) });
    const data = await response.json();
    if (!response.ok) fail(data.code === 'invalid_token' ? 'Token could not be verified. Check BotFather and try again.' : data.code === 'bot_in_use' ? 'This bot is already in use. Stop its previous deployment first.' : 'Bot service is unavailable. Please try again later.');
    return data;
  };
  return { bridge, secret };
}
module.exports = { createService, createBridge, validatePlans, defaults };
