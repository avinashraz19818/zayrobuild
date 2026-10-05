/**
 * Panel <-> server bridge.
 * Ek hi jagah saare API calls, taaki UI me koi adhoora/broken endpoint na rahe.
 */

export const tg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;

/** Telegram Mini App ko ready karo (fullscreen + theme sync). */
export function initTelegram() {
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand?.();
    tg.setHeaderColor?.('#0d1024');
    tg.setBackgroundColor?.('#0d1024');
    tg.disableVerticalSwipes?.();
  } catch (_) { /* purane clients me ye methods nahi hote */ }
  return tg;
}

export function tgUser() {
  try { return tg?.initDataUnsafe?.user || null; } catch (_) { return null; }
}

export function startParam() {
  try { return tg?.initDataUnsafe?.start_param || null; } catch (_) { return null; }
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, formData, signal } = {}) {
  const init = { method, credentials: 'same-origin', signal };
  if (formData) {
    init.body = formData;
  } else if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
  postForm: (p, formData, o) => request(p, { ...o, method: 'POST', formData }),
  put: (p, body, o) => request(p, { ...o, method: 'PUT', body }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' })
};

/* ─────────────────────────  endpoints  ───────────────────────── */

export const auth = {
  me: () => api.get('/api/me'),
  telegram: (initData, ref) => api.post('/api/auth/telegram-webapp', { initData, start_param: ref || null }),
  login: (username, password) => api.post('/api/login', { username, password }),
  register: (username, email, password, ref) => api.post('/api/register', { username, email, password, referral: ref || null }),
  logout: () => api.post('/api/logout', {})
};

export const store = {
  publicConfig: () => api.get('/api/public-config'),
  announcement: () => api.get('/api/announcement'),
  designs: () => api.get('/api/designs'),
  design: (id) => api.get(`/api/designs/${id}`),
  payment: () => api.get('/api/settings/payment'),
  fontStyles: (text) => api.get(`/api/font-styles${text ? `?text=${encodeURIComponent(text)}` : ''}`)
};

export const orders = {
  list: () => api.get('/api/orders'),
  status: (id) => api.get(`/api/orders/${id}/status`),
  create: (formData) => api.postForm('/api/order', formData),
  changeDomain: (id, body) => api.post(`/api/orders/${id}/change-domain`, body),
  coupon: (code, subtotal) => api.post('/api/coupons/validate', { code, subtotal }),
  fakeSites: () => api.get('/api/me/fake-sites')
};

export const wallet = {
  request: ({ coins, utr, screenshot }) => {
    const fd = new FormData();
    fd.append('coins', String(coins));
    fd.append('utr', utr);
    if (screenshot) fd.append('screenshot', screenshot);
    return api.postForm('/api/coins/request', fd);
  },
  referral: () => api.get('/api/me/referral')
};

export const admin = {
  dashboard: () => api.get('/api/admin/dashboard'),
  coinRequests: () => api.get('/api/admin/coin-requests'),
  approve: (id) => api.post(`/api/admin/coin-requests/${id}/approve`, {}),
  reject: (id) => api.post(`/api/admin/coin-requests/${id}/reject`, {}),
  users: () => api.get('/api/admin/users'),
  setCoins: (id, coins) => api.post(`/api/admin/users/${id}/coins`, { coins }),
  orders: () => api.get('/api/admin/orders?limit=40'),
  rebuild: (id) => api.post(`/api/admin/orders/${id}/rebuild`, {}),
  settings: () => api.get('/api/admin/settings'),
  saveSetting: (key, value) => api.post('/api/admin/settings', { [key]: value }),
  designs: () => api.get('/api/admin/designs')
};

/* ─────────────────────────  helpers  ───────────────────────── */

export const fmtCoin = (n) => Number(n || 0).toLocaleString('en-IN');

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).includes('T') || String(value).includes('-') ? value : Number(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

export const fmtDay = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).includes('T') || String(value).includes('-') ? value : Number(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ORDER_STATUS = {
  pending: { label: 'Queued', tone: 'warn' },
  building: { label: 'Building', tone: 'info' },
  done: { label: 'Ready', tone: 'ok' },
  failed: { label: 'Failed', tone: 'bad' }
};

export const statusOf = (status) => ORDER_STATUS[status] || { label: status || 'Unknown', tone: 'idle' };

export const initials = (name) => {
  const s = String(name || '').trim();
  if (!s) return 'Z';
  return s.slice(0, 2).toUpperCase();
};

export const displayName = (user) => {
  if (!user) return 'Guest';
  return user.first_name || user.tg_username || user.username || 'User';
};

export function copyText(text) {
  const value = String(text || '');
  if (!value) return Promise.resolve(false);
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).then(() => true).catch(() => fallbackCopy(value));
  }
  return Promise.resolve(fallbackCopy(value));
}

function fallbackCopy(value) {
  try {
    const el = document.createElement('textarea');
    el.value = value;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
    return true;
  } catch (_) { return false; }
}

/** Telegram share sheet ya native share — dono me se jo available ho. */
export function shareLink(url, text) {
  const payload = text ? `${text}\n${url}` : url;
  try {
    if (tg?.openTelegramLink && url.startsWith('https://t.me/')) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`);
      return true;
    }
  } catch (_) { /* fall through */ }
  if (navigator.share) {
    navigator.share({ title: 'ZAYRO BUILD', text: text || '', url }).catch(() => {});
    return true;
  }
  copyText(payload);
  return false;
}

export function openTelegramLink(url) {
  try {
    if (tg?.openTelegramLink && /^https?:\/\/t\.me\//i.test(url)) return tg.openTelegramLink(url);
    if (tg?.openLink) return tg.openLink(url);
  } catch (_) { /* fall through */ }
  window.open(url, '_blank', 'noopener');
}
