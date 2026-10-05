#!/usr/bin/env node
'use strict';

/**
 * firebase-rules-rest.js — Firebase Realtime Database RULES ko REST API se deploy karo.
 *
 * Kyun: `firebase-tools` ko project-level permissions + Firebase Management API chahiye
 * ("Failed to get details for project" wahi error hai). Par RTDB REST API me rules write karne
 * ka apna endpoint hai — uske liye sirf database scope wali service-account key chahiye:
 *
 *   PUT https://<db>.firebaseio.com/.settings/rules.json?access_token=<token>
 *
 * Usage (VPS, project folder se):
 *   node scripts/firebase-rules-rest.js            # deploy database.rules.json
 *   node scripts/firebase-rules-rest.js --check    # sirf live rules dikhao (deploy mat karo)
 */

try { require('dns').setDefaultResultOrder('ipv4first'); } catch (_) {}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
try { require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env') }); } catch (_) {}

const CHECK_ONLY = process.argv.includes('--check');

function readEnv(key) {
  try {
    const line = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/).find(l => l.startsWith(key + '='));
    return line ? line.slice(key.length + 1).trim() : '';
  } catch (_) { return ''; }
}

const SA_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(ROOT, 'firebase-service-account.json');
const RULES_FILE = path.join(ROOT, 'database.rules.json');

let sa;
try { sa = JSON.parse(fs.readFileSync(SA_FILE, 'utf8')); } catch (error) {
  console.error('❌ Service account file padhi nahi ja saki:', SA_FILE, '—', error.message);
  process.exit(1);
}
if (!sa.client_email || !sa.private_key) {
  console.error('❌ Service account me client_email/private_key nahi hai:', SA_FILE);
  process.exit(1);
}

// DB URL: .env → service account project se banao
function resolveDbUrl() {
  const fromEnv = (process.env.FIREBASE_DATABASE_URL || readEnv('FIREBASE_DATABASE_URL')).replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const pid = process.env.FIREBASE_PROJECT_ID || readEnv('FIREBASE_PROJECT_ID') || sa.project_id;
  if (!pid) { console.error('❌ FIREBASE_DATABASE_URL ya project id nahi mila.'); process.exit(1); }
  return `https://${pid}-default-rtdb.firebaseio.com`;
}

const DB_URL = resolveDbUrl();

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const assertion = header + '.' + payload + '.' + b64url(sign.sign(sa.private_key));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    signal: AbortSignal.timeout(20_000)
  });
  const j = await res.json().catch(() => ({}));
  if (!j.access_token) {
    const reason = j.error_description || j.error || `HTTP ${res.status}`;
    console.error('❌ Token nahi mila:', reason);
    if (/invalid_grant/i.test(String(reason))) {
      console.error('   → Service-account key invalid hai. Google Cloud Console → IAM → Service Accounts →');
      console.error('     apna account → Keys → Add key → Create new key (JSON) → firebase-service-account.json replace karein.');
    }
    process.exit(1);
  }
  return j.access_token;
}

(async () => {
  console.log('═══ FIREBASE RULES (REST) ═══');
  console.log('DB URL : ' + DB_URL);
  console.log('SA     : ' + SA_FILE + '  (' + sa.client_email + ')');

  const token = await getToken();
  console.log('✅ Token mila');

  if (CHECK_ONLY) {
    const res = await fetch(`${DB_URL}/.settings/rules.json?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20_000) });
    console.log(`\n[live rules] HTTP ${res.status}`);
    console.log((await res.text()).slice(0, 1200));
    return;
  }

  let rules;
  try { rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8')); } catch (error) {
    console.error('❌ database.rules.json padhi nahi ja saki:', error.message);
    process.exit(1);
  }
  if (!rules || typeof rules !== 'object' || !rules.rules) {
    console.error('❌ database.rules.json me top-level "rules" object hona chahiye.');
    process.exit(1);
  }

  const res = await fetch(`${DB_URL}/.settings/rules.json?access_token=${encodeURIComponent(token)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
    signal: AbortSignal.timeout(30_000)
  });
  const text = await res.text();

  if (res.status === 200) {
    console.log('✅ RULES DEPLOY HO GAYI (HTTP 200)');
    console.log('   ' + text.slice(0, 200));
    console.log('\nVerify karne ke liye:  bash scripts/deploy-rules.sh');
  } else {
    console.error(`❌ Rules deploy fail — HTTP ${res.status}`);
    console.error('   ' + text.slice(0, 300));
    if (res.status === 401 || res.status === 403) {
      console.error('   → Service account ko database rules likhne ki permission nahi hai.');
      console.error('     Google Cloud Console → IAM → service account ko "Firebase Rules Admin" ya');
      console.error('     "Firebase Admin" role dein (ya Owner), phir dobara chalayein.');
    }
    process.exit(1);
  }
})().catch(error => {
  const cause = error?.cause || {};
  console.error('❌ ERROR:', cause.code || cause.message || error.message);
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(String(cause.code || cause.message))) {
    console.error('   → VPS se network problem. IPv6 toota ho to band karein:');
    console.error('     sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 && pm2 restart zayro-panel --update-env');
  }
  process.exit(1);
});
