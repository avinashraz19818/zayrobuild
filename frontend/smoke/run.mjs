/**
 * jsdom smoke test — panel mount karke DOM check karta hai.
 *   node smoke/run.mjs
 */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://panel.local/',
  pretendToBeVisual: true
});

const { window } = dom;

/* ── fake data ── */
const DESIGNS = [
  { id: 3, name: 'Zayro Apex VIP', description: 'Animated radar + live win ticker + TTS voice alerts', price_coins: 120, original_price_coins: 200, fake_price_coins: 60, category: 'zayro', preview_image: 'shot1.png', preview_video: 'demo.mp4', preview_images: ['shot2.png'], orders_count: 42, active: 1, maintenance: 0, popup_html_file: 'a.html', fake_popup_html_file: 'fake_a.html', created_at: '2026-10-01 10:00:00' },
  { id: 2, name: 'Dhani Win Core', description: 'Wingo trend + auto deposit gate', price_coins: 90, original_price_coins: 0, fake_price_coins: 45, category: 'dhani', preview_image: 'shot3.png', preview_images: [], orders_count: 18, active: 1, maintenance: 1, popup_html_file: 'b.html', created_at: '2026-09-28 10:00:00' },
  { id: 1, name: 'Red Wings Lite', description: 'Color prediction with timer', price_coins: 60, original_price_coins: 80, fake_price_coins: 30, category: 'zayro', preview_image: '', preview_images: [], orders_count: 7, active: 0, maintenance: 0, popup_html_file: 'c.html', created_at: '2026-09-20 10:00:00' }
];

// Store sirf visible (active) templates dikhata hai — hidden wale admin me rehte hain.
const STORE_DESIGNS = DESIGNS.filter((d) => d.active !== 0);

const USER = {
  id: 7, username: 'builder', email: 'builder@test.dev', coins: 420,
  telegram_id: '8015937475', first_name: 'Avinash', tg_username: 'avinash', photo_url: '', is_telegram: 1, isAdmin: false
};

const ORDERS = [
  { id: 51, user_name: 'Rahul', apk_count: 2, app_name: 'MAAN WIN VIP', package_name: 'com.zayro.maanwin', status: 'done', apk_file: 'maan.apk', fake_apk_file: 'maan_fake.apk', coins_spent: 120, created_at: '2026-10-04 11:20:00', live_link_enabled: 1, design_name: 'Zayro Apex VIP', register_url: 'https://site.com/register?ref=abc' },
  { id: 52, user_name: 'Sahil', apk_count: 1, app_name: 'TIGER PLAY', package_name: 'com.zayro.tiger', status: 'building', apk_file: null, fake_apk_file: null, coins_spent: 90, created_at: '2026-10-05 09:00:00', live_link_enabled: 1, design_name: 'Dhani Win Core', register_url: 'https://play.com/register?ref=xy' },
  { id: 53, user_name: 'Imran', apk_count: 0, app_name: 'SUPER LUDO CHAMPIONS VIP CLUB', package_name: 'com.zayro.ludo', status: 'failed', apk_file: null, fake_apk_file: null, coins_spent: 60, created_at: '2026-10-05 18:45:00', live_link_enabled: 0, design_name: 'Zayro Apex VIP', register_url: 'https://ludo.com/register?ref=zz' }
];

const RESPONSES = {
  '/api/me': USER,
  '/api/public-config': { site_name: 'ZAYRO BUILD', coin_rate: 1, referral_bonus: 10, addon_fake_price: 5, domain_change_price: 10, invite_code_change_price: 10, demo_user_price: 10, support_url: 'https://t.me/zayrosupport', channel_url: 'https://t.me/zayrochannel', bot_username: 'zayrobuild_bot', maintenance: false },
  '/api/announcement': { id: 1, title: 'UPDATE', message: 'MAAN WIN FAKE WEBSITE is now live. Plans from Rs 699 — tap the FAKE WEBSITE tab to buy.', button_text: 'Open now', button_url: 'https://t.me/zayrobuild_bot', created_at: '2026-10-05 08:09:39' },
  '/api/designs': STORE_DESIGNS,
  '/api/settings/payment': { upi_id: 'zayro@upi', upi_qr_image: 'qr.png', coin_rate: '1' },
  '/api/orders': ORDERS,
  '/api/me/coin-requests': [{ id: 9, coins_requested: 500, amount_paid: 500, utr: '428192837192', status: 'approved', created_at: '2026-10-03 12:00:00' }],
  '/api/me/referral': { code: 'ZAYRO7X', link: 'https://t.me/zayrobuild_bot?start=ref_ZAYRO7X', invited_count: 4, pending_count: 1, earned_coins: 40, recent: [{ name: 'Rahul', created_at: '2026-10-02', bonus: 10 }] },
  '/api/orders/51/demo-users': [{ key: '9876543210', created_at: '2026-10-05 10:00:00' }],
  '/api/me/fake-sites': [{ order_id: 51, app_name: 'MAAN WIN VIP', register_url: 'https://fake.com/register', apk_file: 'fake.apk', status: 'done', created_at: '2026-10-04' }],
  '/api/font-styles': [{ key: 'bold', label: 'Bold', sample: '𝗠𝗔𝗔𝗡 𝗪𝗜𝗡' }, { key: 'sansbold', label: 'Bold Sans', sample: 'Maan Win' }],
  /* ── admin panel (phase 4) ── */
  '/api/admin/dashboard': {
    stats: {
      total_users: 128, users_today: 6, total_orders: 342, orders_today: 9,
      completed_orders: 300, building_orders: 4, pending_orders: 2, failed_orders: 36,
      total_apks_built: 512, real_apks_built: 340, fake_apks_built: 172, apks_built_today: 11,
      total_user_coins: 8420, coins_spent_total: 51960, pending_coin_requests: 3, pending_coin_amount: 1500
    },
    recent_orders: [
      { id: 91, app_name: 'MAAN WIN VIP', user_name: 'Rahul', design_name: 'Zayro Apex VIP', created_at: '2026-10-05 10:12:00', apk_count: 2, status: 'building' },
      { id: 90, app_name: 'TIGER PLAY', user_name: 'Sahil', design_name: 'Dhani Win Core', created_at: '2026-10-05 09:02:00', apk_count: 1, status: 'done' }
    ]
  },
  '/api/admin/designs': DESIGNS,
  '/api/admin/coin-requests': [
    { id: 9, user_id: 7, coins_requested: 500, amount_paid: 500, utr: '428192837192', status: 'pending', screenshot_file: 'shot.png', created_at: '2026-10-05 08:00:00' }
  ],
  '/api/admin/orders': ORDERS,
  '/api/admin/users': [
    { id: 7, username: 'builder', first_name: 'Avinash', tg_username: 'avinash', telegram_id: '8015937475', coins: 420, created_at: '2026-09-20 10:00:00' }
  ],
  '/api/admin/bot-deploys': [
    { id: 3, user_id: 7, bot_name: 'Rahul Store', bot_username: '', bot_token: '8123456789…6789', admin_tg_id: '8015937475', plan_key: 'pro', plan_name: 'Pro Bot', price: 1299, status: 'pending', note: '', created_at: '2026-10-05 09:30:00', username: 'builder', tg_username: 'avinash', first_name: 'Avinash', telegram_id: '8015937475', coins: 420 }
  ],
  '/api/admin/announcements': [
    { id: 1, title: 'UPDATE', message: 'MAAN WIN FAKE WEBSITE is now live. Plans from Rs 699.', button_text: 'Open now', button_url: 'https://t.me/zayrobuild_bot', active: 1, created_at: '2026-10-05 08:09:39' }
  ],
  '/api/admin/gift-codes': [
    { id: 1, code: 'ZR-DIWALI-500', coins: 500, max_claims: 100, claimed_count: 12, claims: 12, active: 1, note: 'Diwali promo', expires_at: '', created_at: '2026-10-01 10:00:00' },
    { id: 2, code: 'ZR-WELCOME-50', coins: 50, max_claims: 0, claimed_count: 240, claims: 240, active: 1, note: '', expires_at: '', created_at: '2026-09-20 10:00:00' }
  ],
  '/api/me/gift-claims': [
    { id: 1, code: 'ZR-WELCOME-50', coins: 50, created_at: '2026-10-02 11:00:00' }
  ],
  '/api/admin/users/7/orders': {
    user: { id: 7, username: 'builder', coins: 420 },
    orders: [{ id: 51, app_name: 'MAAN WIN VIP', status: 'done', apk_file: 'maan.apk', coins_spent: 120, design_name: 'Zayro Apex VIP', created_at: '2026-10-04 11:20:00', fake_sites_count: 1 }],
    stats: { total: 1, completed: 1, failed: 0, pending: 0, building: 0 }
  },
  '/api/admin/settings': {
    site_name: 'ZAYRO BUILD', site_url: 'https://panel.example.com', upi_id: 'zayro@upi',
    coin_rate: '1', addon_fake_price: '5', domain_change_price: '10', invite_code_change_price: '10',
    telegram_support_user: 'zayrosupport', telegram_channel_url: '', telegram_admin_id: '8015937475',
    deploy_bot_enabled: '1',
    loading_html_file: 'redload.html', loading_html_files: ['redload.html', 'loading.html'],
    deploy_bot_plans: JSON.stringify([
      { key: 'starter', name: 'Starter Bot', price: 699, days: 30, perks: ['Welcome message bot'] },
      { key: 'pro', name: 'Pro Bot', price: 1299, days: 90, perks: ['Welcome + broadcast'] },
      { key: 'vip', name: 'VIP Bot', price: 1999, days: 365, perks: ['Full auto welcome engine'] }
    ])
  }
};

window.__REQS = [];
window.fetch = async (url, init) => {
  const key = String(url).split('?')[0];
  window.__REQS.push({ method: (init && init.method) || 'GET', path: key });
  if (/^\/api\/orders\/\d+\/demo-users$/.test(key) && init && String(init.method || '').toUpperCase() === 'POST') {
    const sent = JSON.parse(init.body || '{}');
    if (!sent.user_key) return json({ error: 'Enter phone number or user key' }, 400);
    return json({ success: true, key: sent.user_key, price: 10, coins: 410 }, 200);
  }
  if (key === '/api/font-styles') {
    const text = new URL(String(url), 'https://panel.local/').searchParams.get('text') || 'App Name';
    return json([
      { key: 'bold', label: 'Bold', sample: fakeBold(text) },
      { key: 'sansbold', label: 'Bold Sans', sample: String(text) },
      { key: 'mono', label: 'Monospace', sample: String(text) }
    ], 200);
  }
  if (key === '/api/gift-codes/claim' && init) {
    const sent = JSON.parse(init.body || '{}');
    if (String(sent.code || '').toUpperCase() === 'ZR-TEST-100') {
      return json({ success: true, code: 'ZR-TEST-100', coins: 100, balance: 520 }, 200);
    }
    return json({ error: 'Ye gift code exist nahi karta — spelling check karein' }, 200);
  }
  const body = RESPONSES[key];
  if (body === undefined) {
    if (key.startsWith('/api/admin/')) return json({ error: 'not admin' }, 403);
    return json({ error: 'not found' }, 404);
  }
  return json(body, 200);
};
function json(data, status) {
  return { ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data) };
}

// Bold Unicode mapping (server ke utils/fontstyles.js jaisa) — mock me bhi
// wahi styled preview aaye jo asli API deta hai.
const MATH_BOLD_UP = 0x1D400;
const MATH_BOLD_LOW = 0x1D41A;
const MATH_BOLD_DIG = 0x1D7CE;
function fakeBold(text) {
  let out = '';
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) out += String.fromCodePoint(MATH_BOLD_UP + (c - 65));
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(MATH_BOLD_LOW + (c - 97));
    else if (c >= 48 && c <= 57) out += String.fromCodePoint(MATH_BOLD_DIG + (c - 48));
    else out += ch;
  }
  return out;
}
window.__fakeBold = fakeBold;

window.navigator.clipboard = {
  writeText: async () => {},
  readText: async () => 'https://paste.example.com/#/register?invitationCode=PASTED'
};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));

/* jsdom globals */
global.window = window;
global.document = window.document;
global.fetch = window.fetch;
global.Headers = window.Headers;
global.FormData = window.FormData;
global.URLSearchParams = window.URLSearchParams;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true, writable: true });
global.HTMLElement = window.HTMLElement;
global.Element = window.Element;
global.Node = window.Node;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
global.MutationObserver = window.MutationObserver;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.localStorage = window.localStorage;
global.IS_REACT_ACT_ENVIRONMENT = false;

const errors = [];
const origError = console.error;
console.error = (...args) => { errors.push(args.map(String).join(' ')); origError(...args); };

const { mount } = await import(path.resolve('smoke/dist/entry.js'));
const rootEl = window.document.getElementById('root');
mount(rootEl);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2200);

const html = rootEl.innerHTML;
const text = rootEl.textContent || '';

const checks = [
  ['brand name', /Zayro Build/i.test(text) || /ZAYRO BUILD/i.test(text)],
  ['hero title', /Premium APK Marketplace|Welcome back/i.test(text)],
  ['balance card', /Available balance/i.test(text)],
  ['brand tile has Create APK', /Create APK/i.test(text)],
  ['no signin / add-fund button', !/\bSign in\b/i.test(text) && !/Add fund/i.test(text)],
  ['templates section', /Available Templates/i.test(text)],
  ['template card rendered', /Zayro Apex VIP/i.test(text)],
  ['discount badge', /% OFF/i.test(text)],
  ['announcement card', /FAKE WEBSITE is now live/i.test(text)],
  ['sort pills', /Latest/.test(text) && /Popular/.test(text)],
  ['bottom nav', /Templates/.test(text) && /Orders/.test(text) && /Fake Website/.test(text) && /Deploy Bot/.test(text)],
  ['header profile button', /My profile/i.test(text)],
  ['quick actions', /Refer & earn|Refer & Earn/i.test(text)]
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} ${name}`);
}

fs.mkdirSync('smoke/out', { recursive: true });
/* Snapshot: wahi CSS use karo jo live public/index.html reference karta hai, aur
   mock media ko inline placeholder se replace karo — taaki file browser me saaf dikhe. */
const shell = fs.readFileSync('../public/index.html', 'utf8');
const liveCss = (shell.match(/assets\/(index-[A-Za-z0-9_-]+\.css)/) || [])[1];
const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2347"/><stop offset="1" stop-color="#2b2452"/></linearGradient></defs><rect width="300" height="260" fill="url(#g)"/><circle cx="150" cy="112" r="34" fill="#675cec" opacity=".35"/><rect x="96" y="176" width="108" height="12" rx="6" fill="#8b7cff" opacity=".45"/></svg>'
);
const snapshot = html.replace(/src="\/api\/files\/[^"]*"/g, `src="${PH}"`);
fs.writeFileSync('smoke/out/rendered.html', `<!doctype html><html><head><meta charset="utf-8"><title>ZAYRO BUILD — panel snapshot</title><link rel="stylesheet" href="../../../public/assets/${liveCss}"></head><body>${snapshot}</body></html>`);

const realErrors = errors.filter((e) => !/not wrapped in act|ReactDOMTestUtils|Warning: /.test(e));

/* Live CSS filename — snapshot usi ko reference karta hai jo panel use karta hai. */
function liveCssName() {
  const shell = fs.readFileSync('../public/index.html', 'utf8');
  return (shell.match(/assets\/(index-[A-Za-z0-9_-]+\.css)/) || [])[1];
}

/* ── Phase 2: saare tabs + build wizard click-through ── */
async function clickByText(label) {
  // Account tab ab bottom nav me nahi hai — header ke profile chip se khulta hai.
  if (label === 'Account') {
    const chip = window.document.querySelector('.profile-chip');
    if (chip) {
      chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await wait(450);
      return true;
    }
  }
  const nodes = [...window.document.querySelectorAll('button, .tpl-card')];
  const target = nodes.find((n) => (n.textContent || '').trim().toLowerCase().includes(label.toLowerCase()));
  if (!target) { origError(`⚠️  click target not found: ${label}`); return false; }
  target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(450);
  return true;
}

const tabChecks = [
  ['Orders', /My Orders|Abhi koi build nahi/i],
  ['Account', /Account stats|Total orders/i, 'profile'],
  ['Refer', /Referral link|Refer & Earn/i],
  ['Deploy Bot', /Welcome Message Bot|Choose plan/i],
  ['Templates', /image\/video preview ke saath/i],
  ['Fake Website', /Fake builds|Ek order, do APK/i]
];

{
  const nav = window.document.querySelector('.bottomnav');
  const labels = nav ? (nav.textContent || '') : '';
  const ok = /Home/.test(labels) && /Deploy Bot/.test(labels) && /Templates/.test(labels)
    && /Fake Website/.test(labels) && /Orders/.test(labels) && !/Account/.test(labels);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} bottom nav: Home · Deploy Bot · Templates · Fake Website · Orders (no Account)`);
}

origError('\n— tab walk —');
for (const [label, re] of tabChecks) {
  const clicked = await clickByText(label);
  const txt = rootEl.textContent || '';
  const ok = clicked && re.test(txt);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} ${label} tab`);
  // Deploy Bot tab ka alag snapshot — review ke liye
  if (label === 'Deploy Bot' && clicked) {
    fs.writeFileSync('smoke/out/deploy.html',
      `<!doctype html><html><head><meta charset="utf-8"><title>Deploy Bot tab</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${rootEl.innerHTML}</body></html>`);
  }
}

await clickByText('Templates');
{ // premium tile: category naam nahi, 'Create APK' button + discount badge
  const t = rootEl.textContent || '';
  const ok = /Create APK/i.test(t) && !/Zayro Core/i.test(t);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} template tile: Create APK button, no category label`);

  // Maintenance template card par 'UNDER MAINTENANCE' veil + grey button (build block)
  const maintCard = [...rootEl.querySelectorAll('.tpl-card')]
    .find((c) => /Dhani Win Core/.test(c.textContent || ''));
  const maintVeil = maintCard ? /UNDER\s*MAINTENANCE/i.test(maintCard.textContent || '') : false;
  const maintBtn = maintCard ? maintCard.querySelector('.tpl-build.is-maint[disabled]') : null;
  const maintIcons = maintCard ? Boolean(maintCard.querySelector('.tpl-maint-ico svg')) : false;
  if (!maintVeil || !maintBtn || !maintIcons) failed += 1;
  origError(`${maintVeil && maintBtn && maintIcons ? '✅' : '❌'} maintenance card: UNDER MAINTENANCE veil + grey disabled button`);

  // Normal card par ye veil/button NAHI hona chahiye
  const normalCard = [...rootEl.querySelectorAll('.tpl-card')]
    .find((c) => /Zayro Apex VIP/.test(c.textContent || ''));
  const normalClean = normalCard
    ? (!normalCard.querySelector('.tpl-maint-veil') && /Create APK/i.test(normalCard.textContent || ''))
    : false;
  if (!normalClean) failed += 1;
  origError(`${normalClean ? '✅' : '❌'} normal template par veil nahi, Create APK enabled`);

  // Store templates snapshot (maintenance look review ke liye)
  fs.writeFileSync('smoke/out/store-templates.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Store templates</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${rootEl.innerHTML}</body></html>`);

  // Hidden template store par nahi dikhna chahiye
  const noHidden = !/Red Wings Lite/.test(t);
  if (!noHidden) failed += 1;
  origError(`${noHidden ? '✅' : '❌'} hidden template store list me nahi aata`);
}
const card = window.document.querySelector('.tpl-card');
if (card) {
  card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const txt = rootEl.textContent || '';
  const ok = /App name|Build mode|Name style/i.test(txt) && !/Coupon code/i.test(txt);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} build wizard opens`);
} else {
  failed += 1;
  origError('❌ template card not found for wizard test');
}

// wizard band karo, home par jao, phir wallet
await clickByText('Cancel');
await clickByText('Home');
{
  // Telegram-only: koi Sign in / Add fund button nahi hona chahiye
  const t = rootEl.textContent || '';
  const ok = !/\bSign in\b/i.test(t) && !/Add fund/i.test(t);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} no sign-in / no add-fund button (Telegram-only)`);
}
await clickByText('Wallet');
{
  const txt = rootEl.textContent || '';
  const ok = /Choose amount|Submit payment proof|Deposit history/i.test(txt);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} wallet flow`);
}

/* ── Phase 3: Telegram-only panel (koi user nahi) ── */
delete RESPONSES['/api/me'];
const gateHost = window.document.createElement('div');
window.document.body.appendChild(gateHost);
mount(gateHost);
await wait(1400);
{
  const t = gateHost.textContent || '';
  const noSignin = !/Sign in/i.test(t) && !/Create account/i.test(t) && !/Add fund/i.test(t);
  if (!noSignin) failed += 1;
  origError(`${noSignin ? '✅' : '❌'} Telegram-only header (no Sign in / Register buttons)`);

  const gateOk = /Telegram bot/i.test(t);
  if (!gateOk) failed += 1;
  origError(`${gateOk ? '✅' : '❌'} Telegram bot button visible for logged-out users`);

  // guarded tab (Deploy Bot) par gate card
  const navBtns = [...gateHost.querySelectorAll('button')];
  const deployBtn = navBtns.find((b) => (b.textContent || '').trim().toLowerCase().includes('deploy bot'));
  deployBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(500);
  const gt = gateHost.textContent || '';
  const ok = /Open in Telegram/i.test(gt);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} deploy tab par Telegram gate card`);
}

/* ── Phase 4: admin panel (standalone /admin, admin session mock) ── */
RESPONSES['/api/me'] = { ...USER, isAdmin: true };
window.history.replaceState({}, '', '/admin');   // admin panel sirf URL se khulta hai
const adminHost = window.document.createElement('div');
window.document.body.appendChild(adminHost);
mount(adminHost);
await wait(1400);
{
  const t = adminHost.textContent || '';
  const ok = /Admin Panel/i.test(t) && /Overview/.test(t) && /Users/.test(t) && /Gift Codes/.test(t) && /Settings/.test(t);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} admin panel unlock + sidebar tabs visible`);

  const noDeployBot = !/Deploy Bot/.test(t);
  if (!noDeployBot) failed += 1;
  origError(`${noDeployBot ? '✅' : '❌'} admin panel me Deploy Bot tab nahi`);

  // Store panel ka chrome admin page par nahi hona chahiye
  const noStoreChrome = !/Open in Telegram/.test(t) && !/Available balance/.test(t);
  if (!noStoreChrome) failed += 1;
  origError(`${noStoreChrome ? '✅' : '❌'} admin standalone (store chrome nahi)`);

  // User panel se alag: koi admin entry point nahi
  // (Neexche Phase 5b me check hota hai)

  // Har tab click karke check karo ki khulta hai
  for (const label of ['Templates', 'Deposits', 'Orders', 'Users', 'Gift Codes', 'Announce', 'Settings']) {
    const btn = [...adminHost.querySelectorAll('button')]
      .find((b) => (b.textContent || '').trim().toLowerCase().startsWith(label.toLowerCase()));
    btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(420);
    const bodyTxt = adminHost.querySelector('.admin-body')?.textContent || adminHost.textContent || '';
    const shown = bodyTxt.length > 40;
    if (!shown) failed += 1;
    origError(`${shown ? '✅' : '❌'} admin tab: ${label}`);
    fs.writeFileSync(`smoke/out/admin-${label.toLowerCase().replace(/[^a-z]+/g, '-')}.html`,
      `<!doctype html><html><head><meta charset="utf-8"><title>admin ${label}</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
  }
  /* ── Templates tab: naye features (list + Edit + filters + maintenance) ── */
  {
    const findTab = (label) => [...adminHost.querySelectorAll('button')]
      .find((b) => (b.textContent || '').trim().toLowerCase().startsWith(label.toLowerCase()));
    findTab('Templates')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(500);

    const body = adminHost.querySelector('.admin-body') || adminHost;
    const txt = body.textContent || '';
    const pills = [...body.querySelectorAll('.admin-pill-grid .pill')].map((b) => (b.textContent || '').trim());
    const pillOk = ['All', 'Active', 'Maintenance', 'Hidden'].every((l) => pills.some((p) => p.includes(l)));
    if (!pillOk) failed += 1;
    origError(`${pillOk ? '✅' : '❌'} templates filters: All · Active · Maintenance · Hidden (${pills.join(' | ')})`);

    const cards = [...body.querySelectorAll('.admin-table article.card')];
    const editBtns = body.querySelectorAll('.admin-actions .btn');
    const hasEdit = [...editBtns].some((b) => /Edit/i.test(b.textContent || ''));
    if (!hasEdit) failed += 1;
    origError(`${hasEdit ? '✅' : '❌'} har template card par Edit button (${cards.length} cards)`);

    const hasMaintBtn = [...editBtns].some((b) => /Maintenance/i.test(b.textContent || ''));
    if (!hasMaintBtn) failed += 1;
    origError(`${hasMaintBtn ? '✅' : '❌'} template card par Maintenance button`);

    // ── Regression: 'Maintenance' / 'Remove maintenance' click par PATCH jaye
    //    (pehle api.patch hi missing tha → "T.patch is not a function")
    window.__REQS.length = 0;
    const maintBtn = [...body.querySelectorAll('.admin-actions .btn')]
      .find((b) => /Maintenance/i.test(b.textContent || ''));
    maintBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(500);
    const patchReq = window.__REQS.find((r) => r.method === 'PATCH' && /^\/api\/admin\/designs\/\d+$/.test(r.path));
    if (!patchReq) failed += 1;
    origError(`${patchReq ? '✅' : '❌'} maintenance toggle PATCH bhejta hai (${patchReq ? patchReq.path : 'koi PATCH nahi'})`);

    const errToast = [...adminHost.querySelectorAll('.toast, [class*=toast]')]
      .some((t) => /is not a function|not a function/i.test(t.textContent || ''));
    if (errToast) failed += 1;
    origError(`${!errToast ? '✅' : '❌'} maintenance toggle par koi JS error nahi`);

    const needsMaintenance = [...editBtns].some((b) => /Remove maintenance/i.test(b.textContent || ''));
    if (!needsMaintenance) failed += 1;
    origError(`${needsMaintenance ? '✅' : '❌'} maintenance-wale card par 'Remove maintenance'`);

    const hasStatus = /Maintenance/.test(txt) && /Hidden/.test(txt) && /Active/.test(txt);
    if (!hasStatus) failed += 1;
    origError(`${hasStatus ? '✅' : '❌'} status chips (Active / Maintenance / Hidden) list me dikhte hain`);

    const hasSearch = Boolean(body.querySelector('input[placeholder*="search" i], input[placeholder*="Search" i]'));
    if (!hasSearch) failed += 1;
    origError(`${hasSearch ? '✅' : '❌'} template search box maujood hai`);

    const hasMediaChips = Boolean(body.querySelector('.tpl-file-chip'));
    if (!hasMediaChips) failed += 1;
    origError(`${hasMediaChips ? '✅' : '❌'} media summary chips (Video / photos / HTML)`);

    // Maintenance filter click → sirf maintenance wale card
    const mPill = [...body.querySelectorAll('.admin-pill-grid .pill')].find((b) => /Maintenance/.test(b.textContent || ''));
    mPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(320);
    const afterFilter = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('.admin-table article.card')];
    const onlyMaint = afterFilter.length === 1 && /Dhani Win Core/.test(afterFilter[0].textContent || '');
    if (!onlyMaint) failed += 1;
    origError(`${onlyMaint ? '✅' : '❌'} Maintenance filter sirf maintenance templates dikhata hai (${afterFilter.length})`);

    // Hidden filter
    const hPill = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('.admin-pill-grid .pill')].find((b) => /Hidden/.test(b.textContent || ''));
    hPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(320);
    const afterHidden = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('.admin-table article.card')];
    const onlyHidden = afterHidden.length === 1 && /Red Wings Lite/.test(afterHidden[0].textContent || '');
    if (!onlyHidden) failed += 1;
    origError(`${onlyHidden ? '✅' : '❌'} Hidden filter sirf hidden templates dikhata hai (${afterHidden.length})`);

    // Edit sheet khulta hai
    const firstEdit = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('.admin-actions .btn')].find((b) => /Edit/i.test(b.textContent || ''));
    firstEdit?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(420);
    const sheet = adminHost.querySelector('.sheet');
    const sheetTxt = sheet?.textContent || '';
    const sheetOk = Boolean(sheet) && /Edit ·/.test(sheetTxt) && /Maintenance/i.test(sheetTxt) && /Store par visible|Hidden/.test(sheetTxt);
    if (!sheetOk) failed += 1;
    origError(`${sheetOk ? '✅' : '❌'} Edit sheet khulta hai (name/price/visibility/maintenance/files)`);
    fs.writeFileSync('smoke/out/admin-templates-edit.html',
      `<!doctype html><html><head><meta charset="utf-8"><title>Template edit</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
    adminHost.querySelector('.sheet .icon-btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(300);

    // All filter wapas
    const allPill = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('.admin-pill-grid .pill')].find((b) => /All/.test(b.textContent || ''));
    allPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(280);

    // ── New template sheet: popup HTML + fake HTML + preview image/video/photos ──
    const newBtn = [...(adminHost.querySelector('.admin-body') || adminHost).querySelectorAll('button')]
      .find((b) => /New template/i.test(b.textContent || ''));
    newBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(500);
    const cSheet = adminHost.querySelector('.sheet');
    const cTxt = cSheet?.textContent || '';
    const cNeeds = ['Popup HTML', 'Fake popup HTML', 'Cover image', 'Preview video', 'Photos', 'Maintenance', 'Store par visible'];
    const missingCreate = cNeeds.filter((n) => !cTxt.includes(n));
    const createOk = Boolean(cSheet) && missingCreate.length === 0;
    if (!createOk) failed += 1;
    origError(`${createOk ? '✅' : '❌'} New template sheet: saare fields (${missingCreate.length ? 'missing: ' + missingCreate.join(', ') : 'popup + fake + image + video + photos + toggles'})`);
    const toggleCount = cSheet ? cSheet.querySelectorAll('.admin-switch').length : 0;
    if (toggleCount < 2) failed += 1;
    origError(`${toggleCount >= 2 ? '✅' : '❌'} New template me visibility + maintenance toggle (${toggleCount})`);
    fs.writeFileSync('smoke/out/admin-templates-new.html',
      `<!doctype html><html><head><meta charset="utf-8"><title>New template</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
    cSheet?.querySelector('.icon-btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(300);
  }

  // ── Settings: loading screen + build engine cards ──
  {
    const sBtn = [...adminHost.querySelectorAll('button')].find((b) => /^Settings/i.test((b.textContent || '').trim()));
    sBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(700);
    const body = adminHost.querySelector('.admin-body') || adminHost;
    const st = body.textContent || '';
    const loadingOk = /Loading screen \(APK\)/.test(st) && /redload\.html/.test(st) && /Upload loading HTML/.test(st);
    if (!loadingOk) failed += 1;
    origError(`${loadingOk ? '✅' : '❌'} Settings: Loading screen card (current file + upload + server list)`);

    fs.writeFileSync('smoke/out/admin-settings.html',
      `<!doctype html><html><head><meta charset="utf-8"><title>Admin · Settings</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
  }

  // screenshot ke liye wapas overview
  const ov = [...adminHost.querySelectorAll('button')].find((b) => (b.textContent || '').trim().toLowerCase().startsWith('overview'));
  ov?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(420);

  fs.writeFileSync('smoke/out/admin.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin panel — standalone</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
  origError('✅ admin snapshot → smoke/out/admin.html');
}

/* ── Phase 5: Gift code claim (profile → sheet → success popup) ── */
window.history.replaceState({}, '', '/');   // store panel par wapas
RESPONSES['/api/me'] = { ...USER, isAdmin: false };
const giftHost = window.document.createElement('div');
window.document.body.appendChild(giftHost);
mount(giftHost);
await wait(1400);
// Profile tab kholo (header ke profile chip se)
giftHost.querySelector('.profile-chip')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(700);
// Profile page ka snapshot (wallet card layout check ke liye)
fs.writeFileSync('smoke/out/profile.html',
  `<!doctype html><html><head><meta charset="utf-8"><title>Profile page</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${giftHost.innerHTML}</body></html>`);
{
  const cta = giftHost.querySelector('.gift-cta');
  const ctaOk = Boolean(cta) && /Gift Code/i.test(cta.textContent || '');
  if (!ctaOk) failed += 1;
  origError(`${ctaOk ? '✅' : '❌'} profile gift code card`);

  cta?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(700);
  const openTxt = giftHost.textContent || '';
  const sheetOk = /Redeem your gift code/i.test(openTxt) && /Claim gift code/i.test(openTxt);
  if (!sheetOk) failed += 1;
  origError(`${sheetOk ? '✅' : '❌'} gift code sheet khulti hai`);

  const historyOk = /ZR-WELCOME-50/.test(openTxt);
  if (!historyOk) failed += 1;
  origError(`${historyOk ? '✅' : '❌'} claim history list dikhti hai`);

  // galat code → error toast
  const submitClaim = () => {
    const btn = [...giftHost.querySelectorAll('button')]
      .find((b) => (b.textContent || '').trim().toLowerCase().startsWith('claim gift'));
    const form = btn?.closest('form');
    if (form) form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    else btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  };
  const setValue = (el, val) => {
    if (!el) return;
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    desc?.set?.call(el, val);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  };
  setValue(giftHost.querySelector('.gift-input'), 'ZR-BAD-CODE');
  await wait(120);
  submitClaim();
  await wait(900);
  const errOk = /exist nahi karta/i.test(giftHost.textContent || '');
  if (!errOk) failed += 1;
  origError(`${errOk ? '✅' : '❌'} galat code par error message`);

  // sahi code → success popup
  setValue(giftHost.querySelector('.gift-input'), 'ZR-TEST-100');
  await wait(120);
  submitClaim();
  await wait(800);
  const winTxt = giftHost.textContent || '';
  const winOk = /Gift Code Claimed/i.test(winTxt) && /\+100/.test(winTxt) && /520 coins/i.test(winTxt);
  if (!winOk) failed += 1;
  origError(`${winOk ? '✅' : '❌'} claim success popup (+coins + new balance)`);

  fs.writeFileSync('smoke/out/gift.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Gift code claim</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${giftHost.innerHTML}</body></html>`);
}

const realErrors2 = errors.filter((e) => !/not wrapped in act|ReactDOMTestUtils|Warning: /.test(e));
if (realErrors.length) {
  origError(`\n❌ ${realErrors.length} runtime error(s):`);
  realErrors.slice(0, 6).forEach((e) => origError('   ' + e.slice(0, 300)));
}

/* ── Phase 5b: panel me admin ke entry points NAHI hone chahiye (URL-only) ── */
{
  window.history.replaceState({}, '', '/');
  const cleanHost = window.document.createElement('div');
  cleanHost.textContent = '';
  RESPONSES['/api/me'] = { ...USER, isAdmin: true };   // admin logged in hone par bhi
  window.document.body.appendChild(cleanHost);
  mount(cleanHost);
  await wait(1200);
  const t = cleanHost.textContent || '';
  const noHomeBtn = !/Open admin panel/i.test(t);
  if (!noHomeBtn) failed += 1;
  origError(`${noHomeBtn ? '✅' : '❌'} Home par admin entry nahi (URL-only)`);
  const noNavTab = ![...cleanHost.querySelectorAll('button')].some((b) => (b.textContent || '').trim().toLowerCase() === 'admin');
  if (!noNavTab) failed += 1;
  origError(`${noNavTab ? '✅' : '❌'} nav me admin tab nahi (URL-only)`);
  // profile (account) tab par bhi admin row nahi
  const accBtn = [...cleanHost.querySelectorAll('button')].find((b) => /account/i.test(b.textContent || ''));
  accBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const at = cleanHost.textContent || '';
  const noAccRow = !/Admin panel/i.test(at);
  if (!noAccRow) failed += 1;
  origError(`${noAccRow ? '✅' : '❌'} Account tab par admin row nahi (URL-only)`);
}

/* ── Phase 6: /admin deep-link (URL se seedha admin unlock screen) ── */
RESPONSES['/api/me'] = { ...USER, isAdmin: false };   // normal user (admin nahi)
window.history.replaceState({}, '', '/admin');
const deepHost = window.document.createElement('div');
window.document.body.appendChild(deepHost);
mount(deepHost);
await wait(1200);
{
  const t = deepHost.textContent || '';
  const ok = /Admin Panel/i.test(t) && /Unlock panel/i.test(t);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} /admin URL seedha admin login screen kholta hai`);

  const urlOk = window.location.pathname === '/admin';
  if (!urlOk) failed += 1;
  origError(`${urlOk ? '✅' : '❌'} /admin URL sync (pathname = ${window.location.pathname})`);

  // Login screen par store panel ka wapas-jaane ka link hona chahiye
  const backLink = [...deepHost.querySelectorAll('a')].some((a) => (a.textContent || '').includes('Store panel'));
  if (!backLink) failed += 1;
  origError(`${backLink ? '✅' : '❌'} admin login par 'Store panel' wapas link`);
}

/* ── Phase 7: Orders → Dynamic links (price) + Demo account (FREE, alag modal) ── */
{
  window.history.replaceState({}, '', '/');
  RESPONSES['/api/me'] = USER;
  const olHost = window.document.createElement('div');
  window.document.body.appendChild(olHost);
  mount(olHost);
  await wait(1500);

  const clickBtn = async (re, scoped = olHost) => {
    const btn = [...scoped.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
    if (!btn) return false;
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(700);
    return true;
  };

  await clickBtn(/^orders$/i);
  const cardOk = await clickBtn(/^dynamic links$/i);
  const dlTxt = olHost.querySelector('.sheet')?.textContent || '';
  const priceOk = cardOk && /Main domain/.test(dlTxt) && /Full invite code/.test(dlTxt)
    && /10 coins/.test(dlTxt) && /change karne ka charge/.test(dlTxt)
    && /Update live link · 10 coins/.test(dlTxt);
  if (!priceOk) failed += 1;
  origError(`${priceOk ? '✅' : '❌'} Dynamic links sheet: dono change types ka price + CTA par coins (10 coins)`);

  // Live links sheet me demo ka koi zikr nahi hona chahiye (dono alag features hain)
  const noDemoInside = !/Demo account/i.test(dlTxt);
  if (!noDemoInside) failed += 1;
  origError(`${noDemoInside ? '✅' : '❌'} Live links sheet me Demo ka mix nahi (dono alag features)`);

  await clickBtn(/^cancel$/i);

  // Ab alag "Add demo account" modal
  const demoBtnOk = await clickBtn(/^add demo account$/i);
  await wait(600);
  const dTxt = olHost.textContent || '';
  const demoOk = demoBtnOk
    && /Add Demo Account/.test(dTxt) && /Free — koi coins nahi kat-te/.test(dTxt)
    && /9876543210/.test(dTxt) && /Add Demo/.test(dTxt)
    && !/coins chahiye/i.test(dTxt);
  if (!demoOk) failed += 1;
  origError(`${demoOk ? '✅' : '❌'} Demo account apna alag modal: 'Free — koi coins nahi kat-te' + list + Add Demo`);

  // number daal kar add karo → POST jaye, koi price nahi
  const inp = olHost.querySelector('input[inputmode="tel"]');
  if (inp) {
    const proto = Object.getPrototypeOf(inp);
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(inp, '9123456780');
    inp.dispatchEvent(new window.Event('input', { bubbles: true }));
    await wait(150);
  }
  await clickBtn(/^add demo$/i);
  await wait(900);
  const posted = window.__REQS.some((r) => r.method === 'POST' && /\/api\/orders\/51\/demo-users$/.test(r.path));
  const addOk = posted && /Demo account add ho gaya/.test(olHost.textContent || '');
  if (!addOk) failed += 1;
  origError(`${addOk ? '✅' : '❌'} Demo account add → POST /api/orders/51/demo-users (free)`);

  fs.writeFileSync('smoke/out/demo-account.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Add demo account (free)</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${olHost.innerHTML}</body></html>`);
}

/* ── Phase 8: Admin — Create Order (FREE) hai, par Content Links / Backups / Build engine NAHI ── */
{
  RESPONSES['/api/me'] = { ...USER, isAdmin: true };
  window.history.replaceState({}, '', '/admin');
  const a2 = window.document.createElement('div');
  window.document.body.appendChild(a2);
  mount(a2);
  await wait(1500);

  const aTxt = a2.textContent || '';

  // Dashboard (Overview) ke 'Recent orders' rows — phone par overlap ka main case
  const recentTxt = a2.textContent || '';
  const recentRows = a2.querySelectorAll('.row-item').length;
  const recentOk = recentRows >= 2 && /Recent orders/.test(recentTxt) && / APK/.test(recentTxt);
  if (!recentOk) failed += 1;
  origError(`${recentOk ? '✅' : '❌'} Admin Dashboard 'Recent orders' rows (${recentRows}) me APK chip render hota hai`);
  fs.writeFileSync('smoke/out/admin-overview.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin · Dashboard</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${a2.innerHTML}</body></html>`);

  const noExtraTabs = !/Content Links/.test(aTxt) && !/Database safety copies/i.test(aTxt);
  if (!noExtraTabs) failed += 1;
  origError(`${noExtraTabs ? '✅' : '❌'} Admin nav me Content Links / Backups tabs nahi (user ne hataya)`);

  // Admin nav buttons me label + sub ek hi button me hote hain ("OrdersBuilds & APKs")
  const clickAdmin = async (label, scoped = a2) => {
    const btn = [...scoped.querySelectorAll('button')].find((b) => new RegExp(`^${label}`, 'i').test((b.textContent || '').trim()));
    if (!btn) return false;
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(800);
    return true;
  };

  const clickedOrders = await clickAdmin('Orders');
  await wait(700);
  const oTxt = a2.textContent || '';
  const createBtn = clickedOrders && /Create Order \(FREE\)/.test(oTxt);
  if (!createBtn) failed += 1;
  origError(`${createBtn ? '✅' : '❌'} Admin Orders me 'Create Order (FREE)' button`);

  fs.writeFileSync('smoke/out/admin-orders.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin · Orders</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${a2.innerHTML}</body></html>`);

  // Create Order sheet khule aur FREE dikhaye
  const clickCreateOrder = async () => {
    const btn = [...a2.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Create Order (FREE)'));
    if (!btn) return false;
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(900);
    return true;
  };
  await clickCreateOrder();
  await wait(1100);
  const cTxt = a2.textContent || '';
  const createOk = /Create Order/.test(cTxt) && /User ke coins nahi kat-te/.test(cTxt)
    && /Select user/.test(cTxt) && /Register URL/.test(cTxt) && /Order banayein · FREE/.test(cTxt);
  if (!createOk) failed += 1;
  origError(`${createOk ? '✅' : '❌'} Create Order (FREE) sheet: user select + site fields + FREE CTA`);

  // Create order sheet band karo, Settings kholo — Build engine card nahi hona chahiye
  a2.querySelector('.sheet .icon-btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  await clickAdmin('Settings');
  await wait(800);
  const st = (a2.querySelector('.admin-body') || a2).textContent || '';
  const noEngine = !/Build engine/.test(st) && !/Android project \(ZIP\)/.test(st) && !/Base APKs/.test(st) && !/Project ZIP upload/.test(st);
  if (!noEngine) failed += 1;
  origError(`${noEngine ? '✅' : '❌'} Settings me Build engine / Android project upload card nahi (user ne hataya)`);

  const keepLoading = /Loading screen \(APK\)/.test(st) && /Upload loading HTML/.test(st);
  if (!keepLoading) failed += 1;
  origError(`${keepLoading ? '✅' : '❌'} Settings ka loading-screen card barkarar hai`);

  fs.writeFileSync('smoke/out/admin-settings.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin · Settings</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${a2.innerHTML}</body></html>`);

  // Users tab ke checks (Coins / APKs / TG)
  await clickAdmin('Users');
  await wait(800);
  const body = a2.querySelector('.admin-body') || a2;
  const ut = body.textContent || '';
  const rowOk = /builder/.test(ut) && /Coins/.test(ut) && /APKs/.test(ut) && /TG/.test(ut);
  if (!rowOk) failed += 1;
  origError(`${rowOk ? '✅' : '❌'} Users row: Coins + APKs + TG buttons`);

  const searchOk = Boolean(body.querySelector('input[placeholder*="Telegram" i]'));
  if (!searchOk) failed += 1;
  origError(`${searchOk ? '✅' : '❌'} Users search box (ID / naam / Telegram)`);

  const bulkOk = /Coin rate \(₹ per coin\)/.test(ut) && /Sab par apply/.test(ut);
  if (!bulkOk) failed += 1;
  origError(`${bulkOk ? '✅' : '❌'} Users: coin rate bulk apply row`);

  const tgBtn = [...body.querySelectorAll('button')].find((b) => /^TG$/i.test((b.textContent || '').trim()));
  tgBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  const tgTxt = body.textContent || '';
  const tgOk = /Telegram ID ·/.test(tgTxt) && /8015937475/.test(tgTxt) && /Save Telegram ID/.test(tgTxt);
  if (!tgOk) failed += 1;
  origError(`${tgOk ? '✅' : '❌'} Users: Telegram ID sheet (current ID + clash-safe save)`);

  const apkBtn = [...body.querySelectorAll('button')].find((b) => /^APKs$/i.test((b.textContent || '').trim()));
  apkBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(800);
  const apkTxt = a2.querySelector('.sheet')?.textContent || '';
  const apkOk = /MAAN WIN VIP/.test(apkTxt) && /Ready/.test(apkTxt);
  if (!apkOk) failed += 1;
  origError(`${apkOk ? '✅' : '❌'} Users → APKs sheet: user ke orders + stats`);
  a2.querySelector('.sheet .icon-btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  fs.writeFileSync('smoke/out/admin-users.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin · Users</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${a2.innerHTML}</body></html>`);
}

/* ── Phase 9: CSS regression — phone par icon inline + row title/sub block (Round 17) ── */
{
  const cssName = liveCssName();
  const css = cssName ? fs.readFileSync(`../public/assets/${cssName}`, 'utf8') : '';
  const noBlockSvg = !/img,\s*svg,\s*video\s*\{\s*display:\s*block/.test(css);
  if (!noBlockSvg) failed += 1;
  origError(`${noBlockSvg ? '✅' : '❌'} CSS: global 'img, svg, video { display: block }' hata (heading icons apni line par nahi jaate)`);

  const inlineSvg = /svg\s*\{[^}]*display:\s*inline-block/.test(css);
  if (!inlineSvg) failed += 1;
  origError(`${inlineSvg ? '✅' : '❌'} CSS: svg text ke andar inline rehta hai`);

  const rowBlock = /\.row-main\s*[> ]\s*\.row-title[^{]*\{[^}]*display:\s*block/.test(css);
  if (!rowBlock) failed += 1;
  origError(`${rowBlock ? '✅' : '❌'} CSS: row-title / row-sub block (title upar, meta neeche — overlap nahi)`);

  const mobileWrap = /\.admin-app\s+\.row-item\s*\{[^}]*flex-wrap:\s*wrap/.test(css);
  if (!mobileWrap) failed += 1;
  origError(`${mobileWrap ? '✅' : '❌'} CSS: phone par admin row chips agli line par wrap hote hain`);

  const usersGrid = /\.admin-user-item\s*\{[^}]*grid-template-areas:[^}]*actions actions/.test(css);
  if (!usersGrid) failed += 1;
  origError(`${usersGrid ? '✅' : '❌'} CSS: Users row me action buttons poori width ki line par`);
}

/* ── Phase 10: Build wizard v2 — naam+icon+style preview, mode/link form, payment ── */
{
  RESPONSES['/api/me'] = { ...USER, isAdmin: false };
  window.history.replaceState({}, '', '/');
  const w = window.document.createElement('div');
  window.document.body.appendChild(w);
  mount(w);
  await wait(1700);

  const setValue = (el, val) => {
    if (!el) return false;
    const proto = Object.getPrototypeOf(el);
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, val);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    return true;
  };
  const clickIn = (scope, re) => {
    const btn = [...scope.querySelectorAll('button')].find((b) => re.test((b.textContent || '').trim()));
    if (btn) btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    return Boolean(btn);
  };
  const snap = (file, title) => {
    fs.writeFileSync(`smoke/out/${file}`,
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${w.innerHTML}</body></html>`);
  };

  // wizard kholo (store ke pehle template card se)
  w.querySelector('.tpl-card')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(1000);
  const sheet = w.querySelector('.sheet');
  const t1 = sheet?.textContent || '';
  const step1Ok = /Step 1\/3/.test(t1) && /Launcher preview/.test(t1)
    && /Name style/.test(t1) && /App icon/.test(t1) && /Upload icon/.test(t1);
  if (!step1Ok) failed += 1;
  origError(`${step1Ok ? '✅' : '❌'} Wizard step 1: app name + launcher preview + name style + icon upload`);

  // naam likho → input me hi style lagta hai (bold) aur launcher label styled Unicode me
  const nameInput = sheet?.querySelector('.name-input');
  setValue(nameInput, 'ZAYRO VIP');
  await wait(700);
  const labelText = w.querySelector('.launcher-label')?.textContent || '';
  const boldOk = labelText === window.__fakeBold('ZAYRO VIP');
  if (!boldOk) failed += 1;
  origError(`${boldOk ? '✅' : '❌'} Naam likhte hi launcher label styled (Unicode bold) dikhta hai — '${labelText}'`);

  const inputStyled = (nameInput?.getAttribute('style') || '').includes('900');
  if (!inputStyled) failed += 1;
  origError(`${inputStyled ? '✅' : '❌'} Input box khud selected style me render hota hai (font-weight 900)`);

  // style chip select → chip active + label style badal jaata hai
  const chips = [...(sheet?.querySelectorAll('.style-chip') || [])];
  const chipOk = chips.length >= 3 && /Bold/.test(chips[0].textContent || '');
  if (!chipOk) failed += 1;
  origError(`${chipOk ? '✅' : '❌'} Name style grid ke chips (${chips.length}) live sample ke saath`);

  chips[1]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  const monoChip = chips[2];
  monoChip?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  const afterChip = w.querySelector('.launcher-label')?.textContent || '';
  const styleSwitchOk = /Monospace/.test(w.querySelector('.launcher-card')?.textContent || '')
    && (nameInput?.getAttribute('style') || '').includes('monospace')
    && afterChip === 'ZAYRO VIP' // mono mock sample plain text deta hai
    && chips[2].className.includes('active');
  if (!styleSwitchOk) failed += 1;
  origError(`${styleSwitchOk ? '✅' : '❌'} Style chip badalne par input + launcher preview dono update`);

  snap('build-step1.html', 'Build wizard · Step 1');

  // ── Step 2: mode cards + URL validation + deposit chips ──
  clickIn(sheet, /^Continue/);
  await wait(500);
  const t2 = sheet?.textContent || '';
  const step2Ok = /Step 2\/3/.test(t2) && /Build mode/.test(t2) && /Real \+ Fake/.test(t2)
    && /Register URL/.test(t2) && /Minimum deposit/.test(t2);
  if (!step2Ok) failed += 1;
  origError(`${step2Ok ? '✅' : '❌'} Wizard step 2: build mode cards + register URL + min deposit`);

  const modeCards = [...(sheet?.querySelectorAll('.mode-card') || [])];
  const modePriceOk = modeCards.length === 3 && /coins/.test(modeCards[0].textContent || '') && /Popular/.test(t2);
  if (!modePriceOk) failed += 1;
  origError(`${modePriceOk ? '✅' : '❌'} Mode cards par per-mode price + tag (${modeCards.length} cards)`);

  // galat link → warn badge, sahi link → ok badge
  const urlInput = sheet?.querySelector('.url-field .input');
  setValue(urlInput, 'site-dot-com');
  await wait(250);
  const warnOk = /http\(s\) link daalein/.test(sheet?.textContent || '');
  setValue(urlInput, 'https://bdgwina.biz/#/register?invitationCode=ABC');
  await wait(250);
  const okBadge = /Link theek hai/.test(sheet?.textContent || '');
  if (!(warnOk && okBadge)) failed += 1;
  origError(`${warnOk && okBadge ? '✅' : '❌'} Register URL live validation (galat → warn, sahi → 'Link theek hai')`);

  // Paste button clipboard se bhar deta hai
  const pasteBtn = sheet?.querySelector('.url-btn.paste');
  pasteBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const pasteOk = /PASTED/.test(urlInput?.value || '');
  if (!pasteOk) failed += 1;
  origError(`${pasteOk ? '✅' : '❌'} URL field ka Paste button clipboard se link bharta hai`);

  setValue(urlInput, 'https://bdgwina.biz/#/register?invitationCode=ABC');
  await wait(200);

  // Real + Fake mode → fake URL field + summary
  const bothCard = modeCards.find((c) => /Real \+ Fake/.test(c.textContent || ''));
  bothCard?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  const t2b = sheet?.textContent || '';
  const fakeOk = /Fake register URL/.test(t2b) && /2 APK banenge/.test(t2b) && /Main link jaisa hi rakhein/.test(t2b);
  if (!fakeOk) failed += 1;
  origError(`${fakeOk ? '✅' : '❌'} Real + Fake chunne par fake URL field + '2 APK banenge' summary`);

  // main link jaisa hi rakhein → fake URL fill
  clickIn(sheet, /Main link jaisa hi/);
  await wait(300);
  const fakeInput = [...(sheet?.querySelectorAll('.url-field .input') || [])][1];
  const sameLinkOk = /bdgwina\.biz/.test(fakeInput?.value || '');
  if (!sameLinkOk) failed += 1;
  origError(`${sameLinkOk ? '✅' : '❌'} 'Main link jaisa hi rakhein' se fake URL bhar jaata hai`);

  // deposit chips
  clickIn(sheet, /^₹500$/);
  await wait(250);
  const depositOk = /₹500/.test(sheet?.textContent || '') && /Minimum deposit/.test(t2b);
  if (!depositOk) failed += 1;
  origError(`${depositOk ? '✅' : '❌'} Minimum deposit quick chips (₹100…₹1000)`);

  snap('build-step2.html', 'Build wizard · Step 2');

  // ── Step 3: receipt + total + CTA ──
  const continue2 = [...(sheet?.querySelectorAll('button') || [])].find((b) => /^Continue/.test((b.textContent || '').trim()) && !b.disabled);
  const enabled2 = Boolean(continue2);
  if (!enabled2) failed += 1;
  origError(`${enabled2 ? '✅' : '❌'} Step 2 valid hone par Continue enable hota hai`);
  continue2?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(500);

  const t3 = sheet?.textContent || '';
  const step3Ok = /Step 3\/3/.test(t3) && /Total payable/.test(t3) && /Fake APK add-on/.test(t3)
    && /Build ke baad balance/.test(t3) && /coins abhi kat jaayenge/i.test(t3);
  if (!step3Ok) failed += 1;
  origError(`${step3Ok ? '✅' : '❌'} Wizard step 3: receipt (total + add-on + balance) + "coins kat jaayenge" note`);

  const ctaOk = /Pay 180 coins & build/.test(t3); // 120 (real) + 60 (fake addon)
  if (!ctaOk) failed += 1;
  origError(`${ctaOk ? '✅' : '❌'} CTA par poora total (180 coins = real 120 + fake 60)`);

  const checklistOk = /checklist|check-item/.test(w.innerHTML) && /Bold Sans|Monospace/.test(t3);
  if (!checklistOk) failed += 1;
  origError(`${checklistOk ? '✅' : '❌'} Step 3 checklist: naam + style + link + mode chips`);

  snap('build-step3.html', 'Build wizard · Step 3');

  // ── Sound effects: module bundled + Account me toggle row + click par koi error nahi ──
  const bundleName = (fs.readFileSync('../public/index.html', 'utf8').match(/assets\/(index-[A-Za-z0-9_-]+\.js)/) || [])[1];
  const bundle = bundleName ? fs.readFileSync(`../public/assets/${bundleName}`, 'utf8') : '';
  const sfxBundled = /zayro_sfx_v1/.test(bundle) && /AudioContext/.test(bundle);
  if (!sfxBundled) failed += 1;
  origError(`${sfxBundled ? '✅' : '❌'} Sound engine bundle me hai (Web Audio synth + localStorage preference)`);

  const globalSfx = typeof globalThis.__zayroSfxInstalled !== 'undefined' && globalThis.__zayroSfxInstalled === true;
  if (!globalSfx) failed += 1;
  origError(`${globalSfx ? '✅' : '❌'} Global sound installer lag gaya (har button/pill par tap sound)`);

  // AudioContext na hone par bhi click bina error ke chalta hai (JSDOM me nahi hota)
  const noAudioCtx = typeof window.AudioContext === 'undefined';
  sheet?.querySelector('.name-input')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  w.querySelector('.bottomnav button')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(200);
  const sfxSafe = noAudioCtx && !errors.some((e) => /AudioContext|sfx/i.test(e));
  if (!sfxSafe) failed += 1;
  origError(`${sfxSafe ? '✅' : '❌'} AudioContext na hone par bhi sound calls chup-chaap safe rehte hain`);

  // Account tab: sound toggle row
  w.querySelector('.sheet .icon-btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(400);
  w.querySelector('.profile-chip')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const accTxt = w.textContent || '';
  const toggleOk = /Sound effects/.test(accTxt) && /ON|OFF/.test(accTxt);
  if (!toggleOk) failed += 1;
  origError(`${toggleOk ? '✅' : '❌'} Account me 'Sound effects' ON/OFF row`);

  const soundToggle = [...w.querySelectorAll('button')].find((b) => /Sound effects/.test(b.textContent || ''));
  soundToggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(300);
  const offOk = /OFF/.test((soundToggle?.textContent || ''));
  if (!offOk) failed += 1;
  origError(`${offOk ? '✅' : '❌'} Sound toggle tap par OFF ho jaata hai (setting save hoti hai)`);

  snap('account-sound.html', 'Account · sound toggle');
}

origError(`\nDOM size: ${html.length} chars · text: ${text.length} chars · failures: ${failed} · errors: ${realErrors.length}`);
process.exit(failed || realErrors.length ? 1 : 0);
