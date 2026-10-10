#!/usr/bin/env node
'use strict';

/**
 * set-site-url.js — panel ka public URL ek command me set karo.
 *
 *   node scripts/set-site-url.js https://jaiclub5vip.site
 *
 * Ye kya update karta hai:
 *   1. database settings me `site_url`  → bot ke saare Web App buttons isi URL par jaate hain
 *      (Admin → Settings → Site URL wali value)
 *   2. .env me SITE_URL / BASE_URL      → fallback + link generation
 *
 * Uske baad:  pm2 restart zayro-panel --update-env && pm2 save
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const url = String(process.argv[2] || '').trim().replace(/\/+$/, '');

if (!url) {
  console.error('Usage: node scripts/set-site-url.js https://aapka-domain.com');
  process.exit(1);
}
if (!/^https?:\/\//i.test(url)) {
  console.error('❌ URL http:// ya https:// se shuru hona chahiye (Telegram Mini App ke liye https zaroori hai).');
  process.exit(1);
}
if (/^http:\/\//i.test(url)) {
  console.error('⚠️  Ye http:// hai — Telegram Mini App sirf https:// URLs kholta hai.');
}

// 1) DB setting
try {
  const db = require(path.join(ROOT, 'database', 'db.js'));
  const before = db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value || '(khali)';
  db.prepare("INSERT INTO settings(key,value) VALUES('site_url',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(url);
  const after = db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value;
  console.log(`[settings] site_url: ${before}  →  ${after}`);
} catch (error) {
  console.error('[settings] update fail:', error.message);
  process.exitCode = 1;
}

// 2) .env
try {
  const envPath = path.join(ROOT, '.env');
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const setKey = (key) => {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(env)) env = env.replace(re, `${key}=${url}`);
    else env += (env.endsWith('\n') || !env ? '' : '\n') + `${key}=${url}\n`;
  };
  setKey('SITE_URL');
  setKey('BASE_URL');
  fs.writeFileSync(envPath, env, 'utf8');
  console.log(`[.env]     SITE_URL aur BASE_URL = ${url}`);
} catch (error) {
  console.error('[.env] update fail:', error.message);
}

console.log('\nAb restart karein:  pm2 restart zayro-panel --update-env && pm2 save');
console.log('Bot ka Menu Button bhi restart par apne aap isi URL par set ho jaata hai.');
