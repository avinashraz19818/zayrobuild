import { timedFetch } from './timed-fetch';
/**
 * Panel <-> server bridge.
 * Ek hi jagah saare API calls, taaki UI me koi adhoora/broken endpoint na rahe.
 */

export let tg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) || null;

if (typeof window !== 'undefined') window.addEventListener('telegram-sdk-ready', () => { tg = window.Telegram?.WebApp || null; });

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
  const launch=window.Telegram?.WebApp?.initData;
  if(launch) init.headers={...init.headers,'X-Telegram-Init-Data':launch};
  const {response:res,data:text} = await timedFetch(path, init, method === 'GET' ? 15000 : 120000);
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch (_) { throw new ApiError('Server response sahi nahi aaya. Page refresh karein; agar dikkat rahe to support se baat karein.', res.status, null); }
  }
  if (data?.code==='MINI_APP_REQUIRED' && window.__verifiedMiniAppLaunch && !window.__miniAppRedirecting) {
    window.__miniAppRedirecting=true;
    window.location.replace('/?telegram_access=expired');
  }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }
  // Kuch endpoints validation failure par bhi HTTP 200 dete hain
  // (`{ error: '...' }`) — unhe bhi error ki tarah treat karo, warna UI
  // galat success dikha deta hai.
  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
    throw new ApiError(String(data.error), res.status, data);
  }
  return data;
}

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body }),
  postForm: (p, formData, o) => request(p, { ...o, method: 'POST', formData }),
  put: (p, body, o) => request(p, { ...o, method: 'PUT', body }),
  // ⚠️ `patch` json bhejta hai, `patchForm` files ke saath (multipart).
  patch: (p, body, o) => request(p, { ...o, method: 'PATCH', body }),
  patchForm: (p, formData, o) => request(p, { ...o, method: 'PATCH', formData }),
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
  // Demo accounts — app me test/login ke liye (user ko app me nahi dikhte)
  demoUsers: (id) => api.get(`/api/orders/${id}/demo-users`),
  addDemoUser: (id, userKey) => api.post(`/api/orders/${id}/demo-users`, { user_key: userKey }),
  removeDemoUser: (id, userKey) => api.del(`/api/orders/${id}/demo-users/${encodeURIComponent(userKey)}`),
  fakeSites: () => api.get('/api/me/fake-sites')
};

export const wallet = {
  claimGift: (code) => api.post('/api/gift-codes/claim', { code }),
  giftClaims: () => api.get('/api/me/gift-claims'),
  quote: (method, amount) => api.post('/api/deposits/quote', { method, amount }),
  request: ({ quote_id, utr, screenshot, received_amount, note }) => {
    const fd = new FormData();
    fd.append('quote_id', quote_id);
    if(received_amount!==undefined)fd.append('received_amount',received_amount);
    if(note)fd.append('note',note);
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
  setCoins: (id, action, amount) => api.post(`/api/admin/users/${id}/coins`, { action, amount }),
  deleteUsers: (ids) => api.del('/api/admin/users', { body: { ids } }),
  firebase: (id, variant) => api.get(`/api/admin/orders/${id}/firebase?variant=${encodeURIComponent(variant)}`),
  firebaseLink: (id, body) => api.patch(`/api/admin/orders/${id}/firebase/link`, body),
  firebaseConfig: (id, body) => api.patch(`/api/admin/orders/${id}/firebase/config`, body),
  addDemo: (id, body) => api.post(`/api/admin/orders/${id}/firebase/users`, body),
  removeDemo: (id, variant, key) => api.del(`/api/admin/orders/${id}/firebase/users/${encodeURIComponent(key)}?variant=${encodeURIComponent(variant)}`),
  orders: (params = 'limit=40') => api.get(`/api/admin/orders?${typeof params === 'string' ? params : new URLSearchParams(params)}`),
  rebuild: (id) => api.post(`/api/admin/orders/${id}/rebuild`, {}),
  // Order banane / delete karne ke helpers (admin = FREE, koi coins nahi kat-te)
  createOrder: (fd) => api.postForm('/api/admin/orders/create', fd),
  deleteOrder: (id) => api.del(`/api/admin/orders/${id}`),
  deleteOrders: (ids) => api.del('/api/admin/orders', { body: { ids } }),
  userOrders: (id) => api.get(`/api/admin/users/${id}/orders`),
  deleteUser: (id) => api.del(`/api/admin/users/${id}`),
  setTelegram: (id, telegram_id) => api.post(`/api/admin/users/${id}/telegram`, { telegram_id }),
  settings: () => api.get('/api/admin/settings'),
  saveSetting: (key, value) => api.post('/api/admin/settings', { [key]: value }),
  designs: () => api.get('/api/admin/designs'),
  createDesign: (fd) => api.postForm('/api/admin/designs', fd),
  updateDesign: (id, patch) => api.patch(`/api/admin/designs/${id}`, patch),
  // Edit sheet files ke saath save karta hai (multipart PATCH).
  saveDesign: (id, fd) => api.patchForm(`/api/admin/designs/${id}`, fd),
  deleteDesign: (id) => api.del(`/api/admin/designs/${id}`),
  announcements: () => api.get('/api/admin/announcements'),
  createAnnouncement: (body) => api.post('/api/admin/announcements', body),
  updateAnnouncement: (id, body) => api.patch(`/api/admin/announcements/${id}`, body),
  deleteAnnouncement: (id) => api.del(`/api/admin/announcements/${id}`),
  broadcastAnnouncement: (id) => api.post(`/api/admin/announcements/${id}/broadcast`, {}),
  botDeploys: () => api.get('/api/admin/bot-deploys'),
  setBotDeployStatus: (id, status, note) => api.post(`/api/admin/bot-deploys/${id}`, { status, note }),
  deleteBotDeploy: (id) => api.del(`/api/admin/bot-deploys/${id}`),
  giftCodes: () => api.get('/api/admin/gift-codes'),
  createGiftCode: (body) => api.post('/api/admin/gift-codes', body),
  setGiftCode: (id, active) => api.patch(`/api/admin/gift-codes/${id}`, { active }),
  deleteGiftCode: (id) => api.del(`/api/admin/gift-codes/${id}`)
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
