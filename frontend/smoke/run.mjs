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
  { id: 3, name: 'Zayro Apex VIP', description: 'Animated radar + live win ticker + TTS voice alerts', price_coins: 120, original_price_coins: 200, fake_price_coins: 60, category: 'zayro', preview_image: 'shot1.png', preview_video: 'demo.mp4', preview_images: ['shot2.png'], orders_count: 42 },
  { id: 2, name: 'Dhani Win Core', description: 'Wingo trend + auto deposit gate', price_coins: 90, original_price_coins: 0, fake_price_coins: 45, category: 'dhani', preview_image: 'shot3.png', preview_images: [], orders_count: 18 },
  { id: 1, name: 'Red Wings Lite', description: 'Color prediction with timer', price_coins: 60, original_price_coins: 80, fake_price_coins: 30, category: 'zayro', preview_image: '', preview_images: [], orders_count: 7 }
];

const USER = {
  id: 7, username: 'builder', email: 'builder@test.dev', coins: 420,
  telegram_id: '8015937475', first_name: 'Avinash', tg_username: 'avinash', photo_url: '', is_telegram: 1, isAdmin: false
};

const ORDERS = [
  { id: 51, app_name: 'MAAN WIN VIP', package_name: 'com.zayro.maanwin', status: 'done', apk_file: 'maan.apk', fake_apk_file: 'maan_fake.apk', coins_spent: 120, created_at: '2026-10-04 11:20:00', live_link_enabled: 1, design_name: 'Zayro Apex VIP', register_url: 'https://site.com/register?ref=abc' },
  { id: 52, app_name: 'TIGER PLAY', package_name: 'com.zayro.tiger', status: 'building', apk_file: null, fake_apk_file: null, coins_spent: 90, created_at: '2026-10-05 09:00:00', live_link_enabled: 1, design_name: 'Dhani Win Core', register_url: 'https://play.com/register?ref=xy' }
];

const RESPONSES = {
  '/api/me': USER,
  '/api/public-config': { site_name: 'ZAYRO BUILD', coin_rate: 1, referral_bonus: 10, addon_fake_price: 5, domain_change_price: 10, support_url: 'https://t.me/zayrosupport', channel_url: 'https://t.me/zayrochannel', bot_username: 'zayrobuild_bot', maintenance: false },
  '/api/announcement': { id: 1, title: 'UPDATE', message: 'MAAN WIN FAKE WEBSITE is now live. Plans from Rs 699 — tap the FAKE WEBSITE tab to buy.', button_text: 'Open now', button_url: 'https://t.me/zayrobuild_bot', created_at: '2026-10-05 08:09:39' },
  '/api/designs': DESIGNS,
  '/api/settings/payment': { upi_id: 'zayro@upi', upi_qr_image: 'qr.png', coin_rate: '1' },
  '/api/orders': ORDERS,
  '/api/me/coin-requests': [{ id: 9, coins_requested: 500, amount_paid: 500, utr: '428192837192', status: 'approved', created_at: '2026-10-03 12:00:00' }],
  '/api/me/referral': { code: 'ZAYRO7X', link: 'https://t.me/zayrobuild_bot?start=ref_ZAYRO7X', invited_count: 4, pending_count: 1, earned_coins: 40, recent: [{ name: 'Rahul', created_at: '2026-10-02', bonus: 10 }] },
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
  '/api/admin/coupons': [
    { id: 1, code: 'SAVE10', type: 'fixed', value: 10, max_uses: 100, used_count: 12, active: 1, expires_at: '', created_at: '2026-10-01 10:00:00' }
  ],
  '/api/admin/settings': {
    site_name: 'ZAYRO BUILD', site_url: 'https://panel.example.com', upi_id: 'zayro@upi',
    coin_rate: '1', addon_fake_price: '5', domain_change_price: '10', invite_code_change_price: '10',
    telegram_support_user: 'zayrosupport', telegram_channel_url: '', telegram_admin_id: '8015937475',
    deploy_bot_enabled: '1',
    deploy_bot_plans: JSON.stringify([
      { key: 'starter', name: 'Starter Bot', price: 699, days: 30, perks: ['Welcome message bot'] },
      { key: 'pro', name: 'Pro Bot', price: 1299, days: 90, perks: ['Welcome + broadcast'] },
      { key: 'vip', name: 'VIP Bot', price: 1999, days: 365, perks: ['Full auto welcome engine'] }
    ])
  }
};

window.fetch = async (url) => {
  const key = String(url).split('?')[0];
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

window.navigator.clipboard = { writeText: async () => {} };
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
}
const card = window.document.querySelector('.tpl-card');
if (card) {
  card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(600);
  const txt = rootEl.textContent || '';
  const ok = /App name|Build mode|Name style/i.test(txt);
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

/* ── Phase 4: admin panel (admin session mock) ── */
RESPONSES['/api/me'] = { ...USER, isAdmin: true };
const adminHost = window.document.createElement('div');
window.document.body.appendChild(adminHost);
mount(adminHost);
await wait(1200);
// Admin tab kholo (desktop nav me admin ke liye button aata hai)
{
  const adminBtn = [...adminHost.querySelectorAll('button')]
    .find((b) => (b.textContent || '').trim().toLowerCase() === 'admin');
  adminBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
await wait(1400);
{
  const t = adminHost.textContent || '';
  const ok = /Admin panel/i.test(t) && /Users/.test(t) && /Deploy Bot/i.test(t) && /Coupons/i.test(t);
  if (!ok) failed += 1;
  origError(`${ok ? '✅' : '❌'} admin panel unlock + tabs visible`);

  const kpi = /Pending deposits/i.test(t) && /Coins in wallets/i.test(t);
  if (!kpi) failed += 1;
  origError(`${kpi ? '✅' : '❌'} admin overview KPIs`);

  fs.writeFileSync('smoke/out/admin.html',
    `<!doctype html><html><head><meta charset="utf-8"><title>Admin panel — overview</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);

  // baaki admin tabs ek-ek karke check
  const adminTabs = [
    ['Templates', /New template/i],
    ['Deposits', /Deposit requests/i],
    ['Orders', /Orders \(/],
    ['Users', /Users \(/],
    ['Deploy Bot', /Deploy Bot requests/i],
    ['Announce', /Naya announcement/i],
    ['Coupons', /Naya coupon/i],
    ['Settings', /Save all settings/i]
  ];
  for (const [label, re] of adminTabs) {
    const btn = [...adminHost.querySelectorAll('.admin-tabs button')]
      .find((b) => (b.textContent || '').trim().toLowerCase().startsWith(label.toLowerCase()));
    if (!btn) { failed += 1; origError(`❌ admin tab missing: ${label}`); continue; }
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await wait(420);
    const okTab = re.test(adminHost.textContent || '');
    if (!okTab) failed += 1;
    origError(`${okTab ? '✅' : '❌'} admin tab: ${label}`);
    if (label === 'Deploy Bot') {
      fs.writeFileSync('smoke/out/admin-deploy.html',
        `<!doctype html><html><head><meta charset="utf-8"><title>Admin — Deploy Bot</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
    }
    if (label === 'Settings') {
      fs.writeFileSync('smoke/out/admin-settings.html',
        `<!doctype html><html><head><meta charset="utf-8"><title>Admin — Settings</title><link rel="stylesheet" href="../../../public/assets/${liveCssName()}"></head><body>${adminHost.innerHTML}</body></html>`);
    }
  }
}

const realErrors2 = errors.filter((e) => !/not wrapped in act|ReactDOMTestUtils|Warning: /.test(e));
if (realErrors.length) {
  origError(`\n❌ ${realErrors.length} runtime error(s):`);
  realErrors.slice(0, 6).forEach((e) => origError('   ' + e.slice(0, 300)));
}

origError(`\nDOM size: ${html.length} chars · text: ${text.length} chars · failures: ${failed} · errors: ${realErrors.length}`);
process.exit(failed || realErrors.length ? 1 : 0);
