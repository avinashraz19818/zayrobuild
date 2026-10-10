#!/usr/bin/env node
'use strict';

/**
 * switch-firebase-project.js — poore panel + templates ko ek hi Firebase project par le aao.
 *
 * Kyun zaroori hai:
 *   Panel ka service account + .env ek project ke hain, aur built APK ke andar
 *   (template HTML ka `databaseURL`) doosre project ka ho to "live link" feature
 *   kaam nahi karta — app ek database padhti hai, server doosri me likhta hai.
 *
 * Usage (VPS, project folder se):
 *   node scripts/switch-firebase-project.js                                  # dry-run (kuch nahi badalta)
 *   node scripts/switch-firebase-project.js --apply                          # .env wala URL use karo
 *   node scripts/switch-firebase-project.js --apply https://zayro-build-default-rtdb.asia-southeast1.firebasedatabase.app
 *
 * Undo: templates git me tracked hain → git checkout -- templates
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const ENV_PATH = path.join(ROOT, '.env');

const args = process.argv.slice(2);
const apply = args.includes('--apply');

function readEnvUrl() {
  try {
    const line = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
      .find(l => /^FIREBASE_DATABASE_URL=/.test(l.trim()));
    return line ? line.split('=').slice(1).join('=').trim() : '';
  } catch (_) {
    return '';
  }
}

const urlArg = args.find(a => !a.startsWith('--'));
const targetUrl = (urlArg || readEnvUrl()).replace(/\/+$/, '');

if (!targetUrl) {
  console.error('❌ URL nahi mila. .env me FIREBASE_DATABASE_URL set karein ya URL argument dein.');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(targetUrl)) {
  console.error('❌ URL sahi nahi lag raha:', targetUrl);
  console.error('   Example: https://zayro-build-default-rtdb.firebaseio.com');
  process.exit(1);
}

console.log('═══ FIREBASE PROJECT SWITCH ═══');
console.log('Target DB URL :', targetUrl);
console.log('Mode          :', apply ? 'APPLY (files badlengi)' : 'DRY-RUN (sirf dikhaye ga)');
console.log('');

const files = fs.existsSync(TEMPLATES_DIR)
  ? fs.readdirSync(TEMPLATES_DIR).filter(f => /\.html?$/i.test(f))
  : [];

const seen = new Map();
let changed = 0;

for (const file of files) {
  const full = path.join(TEMPLATES_DIR, file);
  let html;
  try { html = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

  let next = html;
  let touched = false;
  const re = /databaseURL\s*:\s*(["'])(https:\/\/[^"']+)\1/g;
  next = next.replace(re, (match, quote, url) => {
    seen.set(url, (seen.get(url) || 0) + 1);
    if (url === targetUrl) return match;
    touched = true;
    return match.replace(url, targetUrl);
  });

  if (touched) {
    changed++;
    if (apply) {
      try {
        fs.writeFileSync(full, next, 'utf8');
      } catch (error) {
        console.error('  ✗', file, '—', error.message);
      }
    }
  }
}

console.log('Templates me mile purane databaseURL:');
if (!seen.size) console.log('  (koi databaseURL nahi mila)');
for (const [url, count] of [...seen.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count.toString().padStart(3)}×  ${url}${url === targetUrl ? '  (already sahi)' : ''}`);
}

console.log(`\n${apply ? 'Badle gaye' : 'Badlenge'} templates: ${changed} / ${files.length}`);

// .env bhi align kar do (already same ho to chhodo)
if (apply) {
  try {
    const env = fs.readFileSync(ENV_PATH, 'utf8');
    if (/^FIREBASE_DATABASE_URL=/m.test(env)) {
      const next = env.replace(/^FIREBASE_DATABASE_URL=.*$/m, `FIREBASE_DATABASE_URL=${targetUrl}`);
      if (next !== env) { fs.writeFileSync(ENV_PATH, next, 'utf8'); console.log('.env me FIREBASE_DATABASE_URL update ho gaya'); }
      else console.log('.env already sahi tha');
    } else {
      fs.appendFileSync(ENV_PATH, `\nFIREBASE_DATABASE_URL=${targetUrl}\n`);
      console.log('.env me FIREBASE_DATABASE_URL add ho gaya');
    }
  } catch (error) {
    console.error('.env update fail:', error.message);
  }
  console.log('\nAb:  pm2 restart zayro-panel --update-env && pm2 save');
  console.log('Test: node scripts/diag-firebase-auth.js');
} else {
  console.log('\nApply karne ke liye dobara chalayein: node scripts/switch-firebase-project.js --apply');
}
