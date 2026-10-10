'use strict';
// Admin Orders tab ke liye ek hi list: APK builds (orders), website store sales (site_sales)
// aur bot deploy orders (welcome_orders). Teeno ko ek common shape me laate hain.
//
// Row shape: { kind: 'apk'|'site'|'bot', id, user_id, user_name, title, detail, amount, status, created_at, has_apk }
// Status common values: pending | building | done | failed | expired (bot) | refunded flag alag.

const TYPES = new Set(['apk', 'site', 'bot']);
const STATUS_RE = /^[a-z_]{1,20}$/; // parameterized, so any simple status name is safe

const USER_NAME = (alias) =>
  `COALESCE(NULLIF(${alias}.username,''), NULLIF(${alias}.first_name,''), ${alias}.telegram_id, '')`;

// Har kind ka SELECT. Sab ke columns same order me.
const PARTS = {
  apk: `SELECT 'apk' AS kind, o.id AS id, o.user_id AS user_id, ${USER_NAME('u')} AS user_name,
          COALESCE(o.app_name,'') AS title, COALESCE(d.name,'') AS detail, o.coins_spent AS amount,
          o.status AS status, o.created_at AS created_at,
          CASE WHEN COALESCE(o.apk_file,'') <> '' THEN 1 ELSE 0 END AS has_apk
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN designs d ON d.id = o.design_id`,
  site: `SELECT 'site' AS kind, s.id AS id, s.user_id AS user_id, ${USER_NAME('u')} AS user_name,
          s.product_name AS title, (s.kind || ' · ' || s.plan) AS detail, s.total AS amount,
          'done' AS status, s.created_at AS created_at, 0 AS has_apk
        FROM site_sales s
        LEFT JOIN users u ON u.id = s.user_id`,
  bot: `SELECT 'bot' AS kind, w.id AS id, w.user_id AS user_id, ${USER_NAME('u')} AS user_name,
          w.bot_name AS title, (w.kind || ' · @' || w.bot_username) AS detail, w.coins AS amount,
          CASE w.status WHEN 'active' THEN 'done' WHEN 'provisioning' THEN 'building' ELSE w.status END AS status,
          w.created_at AS created_at, 0 AS has_apk
        FROM welcome_orders w
        LEFT JOIN users u ON u.id = w.user_id`,
};

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

// Jo table DB me nahi hai (purane install), usko skip karte hain taaki list crash na ho.
function availableParts(db, type) {
  const want = type === 'all' ? ['apk', 'site', 'bot'] : [type];
  const need = { apk: ['orders', 'users', 'designs'], site: ['site_sales', 'users'], bot: ['welcome_orders', 'users'] };
  return want.filter((k) => need[k].every((t) => tableExists(db, t)));
}

function listAllOrders(db, { type = 'all', status = 'all', search = '', page = 1, limit = 20 } = {}) {
  const kind = TYPES.has(type) ? type : 'all';
  const parts = availableParts(db, kind);
  const pageNo = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  if (!parts.length) return { orders: [], pagination: { total: 0, page: pageNo, limit: perPage, totalPages: 1 } };

  const union = parts.map((k) => PARTS[k]).join('\nUNION ALL\n');
  const where = [];
  const params = [];
  if (status && status !== 'all' && STATUS_RE.test(String(status))) { where.push('status = ?'); params.push(String(status)); }
  const term = String(search || '').trim().slice(0, 80);
  if (term) {
    where.push(`(CAST(id AS TEXT) LIKE ? OR title LIKE ? COLLATE NOCASE OR detail LIKE ? COLLATE NOCASE OR user_name LIKE ? COLLATE NOCASE)`);
    const like = `%${term}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const base = `(${union}) AS all_orders ${whereSql}`;

  const total = db.prepare(`SELECT COUNT(*) AS n FROM ${base}`).get(...params).n;
  const orders = db.prepare(
    `SELECT * FROM ${base} ORDER BY created_at DESC, kind ASC, id DESC LIMIT ? OFFSET ?`
  ).all(...params, perPage, (pageNo - 1) * perPage);

  return {
    orders,
    pagination: { total, page: pageNo, limit: perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  };
}

module.exports = { listAllOrders };
