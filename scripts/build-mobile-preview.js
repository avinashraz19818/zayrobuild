#!/usr/bin/env node
'use strict';

/**
 * Mobile preview hub — smoke snapshots ko ek phone-frame page me dikhata hai
 * (browser me live preview ke liye). Ye generated artifacts hain, isliye
 * sab kuch `frontend/smoke/out/` ke andar likha jaata hai (git-ignored).
 *
 *   node scripts/build-mobile-preview.js
 *
 * Serve:  python3 -m http.server 3001 --directory frontend/smoke/out
 * Open:   http://localhost:3001/          (hub — root par redirect hub par le jaata hai)
 *
 * Pehle `cd frontend && npx vite build --ssr smoke/entry.jsx --outDir smoke/dist
 * && node smoke/run.mjs` chalayein, taaki snapshots fresh hon.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'frontend', 'smoke', 'out');
const MOBILE = path.join(OUT, 'mobile');
const ASSETS = path.join(ROOT, 'public', 'assets');

fs.mkdirSync(MOBILE, { recursive: true });

/* ── 1. Live CSS + JS ko out/ ke andar copy karo (snapshot refs relative hain) ── */
function copyAssets() {
  const destDir = path.join(OUT, 'public', 'assets');
  fs.rmSync(path.join(OUT, 'public'), { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  const files = fs.readdirSync(ASSETS).filter((f) => /\.(css|js)$/.test(f));
  for (const f of files) fs.copyFileSync(path.join(ASSETS, f), path.join(destDir, f));
  return files;
}

/* ── 2. Snapshots ko mobile/ me le jao + CSS ref ko mobile/style.css se jodo ── */
const LIVE_CSS_RE = /\.\.\/\.\.\/\.\.\/public\/assets\/(index-[A-Za-z0-9_-]+\.css)/g;

function stageSnapshots() {
  const staged = [];
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith('.html') || f === 'index.html') continue;
    let html = fs.readFileSync(path.join(OUT, f), 'utf8');
    html = html.replace(LIVE_CSS_RE, 'style.css');
    fs.writeFileSync(path.join(MOBILE, f), html);
    staged.push(f);
  }
  return staged;
}

/* ── 3. Live CSS ko mobile/style.css par copy karo ── */
function copyStyleCss() {
  const name = fs.readdirSync(ASSETS).find((f) => /^index-.*\.css$/.test(f));
  if (name) fs.copyFileSync(path.join(ASSETS, name), path.join(MOBILE, 'style.css'));
  return name;
}

/* ── 4. Hub page ── */
const PHONES = [
  ['rendered.html', 'Storefront', 'Home / templates grid'],
  ['store-templates.html', 'Templates', 'Filter pills + cards'],
  ['admin.html', 'Admin panel', 'URL-only panel'],
  ['admin-settings.html', 'Admin Settings', 'Branding + prices + loading screen'],
  ['demo-accounts.html', 'Live links + Demo accounts', 'Price chips (Round 14)'],
  ['profile.html', 'Profile', 'Wallet + gift code card'],
  ['deploy.html', 'Deploy Bot', 'Plan cards'],
  ['bot-preview.html', 'Bot /start message', 'Premium message + buttons']
];

function writeHub(staged) {
  const cards = PHONES.filter(([file]) => staged.includes(file)).map(([file, title, sub]) => `
    <figure class="phone">
      <figcaption><b>${title}</b><span>${sub}</span></figcaption>
      <div class="frame"><iframe src="mobile/${file}" title="${title}" loading="lazy"></iframe></div>
      <a class="open" href="mobile/${file}" target="_blank" rel="noreferrer">Open full screen ↗</a>
    </figure>`).join('');

  const hub = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ZAYRO BUILD · mobile preview</title>
<link rel="stylesheet" href="public/assets/${fs.readdirSync(ASSETS).find((f) => /^index-.*\.css$/.test(f))}" />
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:26px 20px 60px;background:radial-gradient(1100px 600px at 12% -10%,rgba(103,92,236,.28),transparent 60%),#0b0e1d;color:#f2f1fa;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  h1{margin:0 0 4px;font-size:20px;letter-spacing:.02em}
  .sub{color:#8e94b8;font-size:12px;margin-bottom:22px}
  .grid{display:flex;flex-wrap:wrap;gap:22px}
  .phone{margin:0;width:390px}
  figcaption{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}
  figcaption b{font-size:13.5px}
  figcaption span{font-size:11px;color:#8e94b8}
  .frame{width:390px;height:760px;border-radius:26px;overflow:hidden;background:#0f1226;
         box-shadow:0 0 0 1px rgba(255,255,255,.07),0 24px 60px -28px rgba(0,0,0,.9)}
  iframe{width:390px;height:760px;border:0;background:#0f1226}
  .open{display:inline-block;margin-top:8px;font-size:11.5px;color:#9a93ff;text-decoration:none}
  .open:hover{text-decoration:underline}
</style></head>
<body>
  <h1>ZAYRO BUILD · mobile preview</h1>
  <div class="sub">Round 14 — loading-screen fix, price chips (live links + demo accounts), notice hataya</div>
  <div class="grid">${cards}
  </div>
</body></html>`;

  fs.writeFileSync(path.join(OUT, 'index.html'), hub);
}

const copied = copyAssets();
const staged = stageSnapshots();
const css = copyStyleCss();
writeHub(staged);

console.log(`✅ mobile preview ready — ${staged.length} snapshots staged${css ? ` · style.css = ${css}` : ''}`);
console.log(`   assets copied: ${copied.join(', ')}`);
console.log(`   hub: frontend/smoke/out/index.html`);
console.log(`   serve: python3 -m http.server 3001 --directory frontend/smoke/out`);
