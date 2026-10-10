'use strict';

function idsFrom(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('Select 1–100 items.');
  if (value.some(id => !['string', 'number'].includes(typeof id) || (typeof id === 'string' && !/^\d+$/.test(id)))) throw new Error('Invalid selection.');
  const ids = [...new Set(value.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Invalid selection.');
  return ids;
}
function coinInput(action, amount) {
  if (!['add', 'subtract', 'set'].includes(action)) throw new Error('Choose add, subtract or set.');
  if (amount === '' || amount === null || amount === undefined || !['number', 'string'].includes(typeof amount) || (typeof amount === 'string' && !amount.trim())) throw new Error('Enter a rupee amount.');
  const value = Number(amount);
  if (!Number.isSafeInteger(value) || value < 0 || (action !== 'set' && value === 0)) throw new Error('Enter a valid whole rupee amount.');
  return value;
}
function createAdminManagement(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS admin_coin_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    action TEXT NOT NULL, amount INTEGER NOT NULL, balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
  const active = o => o.status === 'building' || o.status === 'pending';
  function checkOrders(orders) {
    if (orders.some(active)) throw new Error('Pending/building orders cannot be deleted. Wait for completion.');
    for (const o of orders) {
      if (db.prepare("SELECT 1 FROM order_fake_sites WHERE order_id=? AND status IN ('building','pending')").get(o.id)) {
        throw new Error(`Order #${o.id} has a pending/building fake APK. Wait for completion.`);
      }
    }
  }
  const adjustCoins = db.transaction((id, action, amount) => {
    const value = coinInput(action, amount);
    const user = db.prepare('SELECT id,coins FROM users WHERE id=?').get(id);
    if (!user) throw new Error('User not found.');
    const before = Number(user.coins);
    const after = Math.round((action === 'set' ? value : before + (action === 'add' ? value : -value))*100)/100;
    if (!Number.isSafeInteger(Math.round(after*100)) || after < 0) throw new Error('Insufficient balance or amount too large.');
    db.prepare('UPDATE users SET coins=? WHERE id=?').run(after, id);
    db.prepare('INSERT INTO admin_coin_adjustments(user_id,action,amount,balance_before,balance_after) VALUES(?,?,?,?,?)').run(id, action, value, before, after);
    return { success: true, coins: after };
  });
  const deleteOrders = db.transaction(raw => {
    const ids = idsFrom(raw);
    const orders = ids.map(id => db.prepare('SELECT * FROM orders WHERE id=?').get(id));
    if (orders.some(o => !o)) throw new Error('One or more orders no longer exist. Refresh first.');
    checkOrders(orders);
    for (const id of ids) db.prepare('DELETE FROM orders WHERE id=?').run(id);
    return orders;
  });
  const deleteUsers = db.transaction(raw => {
    const ids = idsFrom(raw);
    const orders = [];
    for (const id of ids) {
      if (!db.prepare('SELECT id FROM users WHERE id=?').get(id)) throw new Error('User not found. Refresh first.');
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='welcome_orders'").get() && db.prepare('SELECT 1 FROM welcome_orders WHERE user_id=? LIMIT 1').get(id)) throw new Error('This customer has Welcome Bot purchase history. Keep the account to preserve subscriptions and refunds.');
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='resellers'").get() && db.prepare('SELECT 1 FROM resellers WHERE user_id=?').get(id)) throw new Error('Reseller accounts must be kept for accounting. Disable or suspend reseller access instead.');
      orders.push(...db.prepare('SELECT * FROM orders WHERE user_id=?').all(id));
    }
    checkOrders(orders);
    for (const id of ids) {
      const user = db.prepare('SELECT telegram_id FROM users WHERE id=?').get(id);
      db.prepare('DELETE FROM coin_requests WHERE user_id=?').run(id);
      db.prepare('DELETE FROM gift_code_claims WHERE user_id=?').run(id);
      db.prepare('DELETE FROM bot_deploy_requests WHERE user_id=?').run(id);
      db.prepare('DELETE FROM referrals WHERE referrer_id=? OR referred_user_id=?').run(id, id);
      db.prepare('DELETE FROM referral_pending WHERE referrer_id=? OR chat_id=?').run(id, String(user.telegram_id || ''));
      db.prepare('UPDATE users SET referred_by=NULL WHERE referred_by=?').run(id);
      db.prepare('DELETE FROM orders WHERE user_id=?').run(id);
      db.prepare('DELETE FROM users WHERE id=?').run(id);
    }
    for (const session of db.prepare('SELECT sid,sess FROM sessions').all()) {
      try {
        if (ids.includes(Number(JSON.parse(session.sess).userId))) db.prepare('DELETE FROM sessions WHERE sid=?').run(session.sid);
      } catch (_) { /* malformed sessions expire normally */ }
    }
    return orders;
  });
  return { adjustCoins, deleteOrders, deleteUsers };
}
module.exports = { idsFrom, coinInput, createAdminManagement };
