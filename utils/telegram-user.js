'use strict';
// Hashing yields to concurrent requests. Re-check identity INSIDE the synchronous
// SQLite transaction after hashing; do not race a stale username/telegram lookup.
async function ensureTelegramUser(db, tgUser, { hashPassword, normalizeUsername, now = Date.now }) {
  const chatId = String(tgUser.id);
  const existing = db.prepare('SELECT * FROM users WHERE telegram_id=?').get(chatId);
  const hash = existing ? null : await hashPassword();
  return db.transaction(() => {
    let user = db.prepare('SELECT * FROM users WHERE telegram_id=?').get(chatId);
    const firstName = String(tgUser.first_name || user?.first_name || '').slice(0,100);
    const username = String(tgUser.username || user?.tg_username || '').slice(0,100);
    const photo = String(tgUser.photo_url || user?.photo_url || '').slice(0,500);
    const created = !user;
    if (!user) {
      const base = normalizeUsername(tgUser.username) || `tg_${chatId}`;
      let name = base, attempt = 1;
      while (db.prepare('SELECT 1 FROM users WHERE username=?').get(name)) name = `${base}_${attempt++}`;
      const row = db.prepare(`INSERT INTO users(username,email,password,auth_provider,email_verified_at,coins,telegram_id,first_name,tg_username,photo_url,is_telegram) VALUES(?,?,?,'telegram',?,0,?,?,?,?,1)`).run(name,`${chatId}@telegram.user`,hash,now(),chatId,firstName,username,photo);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(row.lastInsertRowid);
    } else {
      db.prepare("UPDATE users SET first_name=?,tg_username=?,photo_url=?,auth_provider='telegram',email_verified_at=COALESCE(email_verified_at,?) WHERE id=?").run(firstName,username,photo,now(),user.id);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    }
    return { user, created };
  }).immediate();
}
module.exports = { ensureTelegramUser };
