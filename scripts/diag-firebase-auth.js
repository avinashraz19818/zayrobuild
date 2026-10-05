#!/usr/bin/env node
'use strict';

/**
 * diag-firebase-auth.js — Service account token vs Firebase rules ka test.
 *
 * Ye batata hai ki 401 kyun aa raha hai:
 *   A) Token ban raha hai ya nahi
 *   B) Token ke SAATH Firebase write chalti hai ya nahi
 *   C) Bina token ke (baseline — 401 hona chahiye agar rules lagi hain)
 *   D) auth.uid kya hai (Firebase rules simulator se pata nahi chalta,
 *      par read test + write test se andaza mil jata hai)
 *
 * Usage (VPS, project folder se):
 *   node scripts/diag-firebase-auth.js
 */

try { require('dns').setDefaultResultOrder('ipv4first'); } catch (_) {}
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
try { require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env') }); } catch (e) {}
const DB_URL = (process.env.FIREBASE_DATABASE_URL || 'https://zayrodev-195f3-default-rtdb.firebaseio.com').replace(/\/+$/, '');
const SA_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || '/root/apkbuilder/firebase-service-account.json';

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getToken() {
  if (!fs.existsSync(SA_FILE)) { console.log('❌ SA file nahi mili:', SA_FILE); return null; }
  let sa;
  try { sa = JSON.parse(fs.readFileSync(SA_FILE, 'utf8')); }
  catch (e) { console.log('❌ SA file corrupt JSON:', e.message); return null; }
  console.log('✅ SA file OK — client_email:', sa.client_email);
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
  const sig = b64url(sign.sign(sa.private_key));
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: header + '.' + payload + '.' + sig }).toString()
    });
    const j = await res.json();
    if (j && j.access_token) {
      console.log('✅ TOKEN MILA —', j.access_token.slice(0, 15) + '...', '| scope:', j.scope || '(no scope)');
      return j.access_token;
    }
    console.log('❌ TOKEN EXCHANGE FAIL:', JSON.stringify(j).slice(0, 250));
    return null;
  } catch (e) {
    console.log('❌ TOKEN EXCHANGE ERROR:', e.message);
    return null;
  }
}

// Node ke fetch ka "fetch failed" asli wajah chhupa deta hai — usko saaf karke dikhao.
function describeFetchError(error) {
  const cause = error?.cause || {};
  const code = cause.code || cause.errno || '';
  const msg = cause.message || error?.message || 'unknown';
  let hint = '';
  if (code === 'ENOTFOUND' || /ENOTFOUND|getaddrinfo/i.test(msg)) {
    hint = '→ Ye hostname exist nahi karta. Firebase Console → Realtime Database me jo URL likha hai wahi use karein.';
  } else if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    hint = '→ Connection refuse hua — database instance band/bana hua nahi hai.';
  } else if (code === 'ETIMEDOUT' || /timeout/i.test(msg)) {
    hint = '→ Network timeout — VPS se is host tak rasta band hai (firewall/DNS).';
  } else if (/certificate|CERT|TLS|SSL/i.test(msg)) {
    hint = '→ TLS/certificate problem — VPS ki ghadi ya CA store check karein (sudo timedatectl set-ntp true).';
  }
  return `${code ? code + ': ' : ''}${msg}${hint ? '\n     ' + hint : ''}`;
}

async function tryFetch(label, url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    console.log(`${label} → ❌ ${describeFetchError(error)}`);
    return null;
  }
}

async function main() {
  console.log('═══ FIREBASE AUTH DIAGNOSTIC ═══\n');
  const token = await getToken();
  if (!token) { console.log('\n➡️ Token nahi ban raha — upar ka error dekh kar fix karo.'); return; }

  const { getDefaultResultOrder } = require('dns');
  console.log(`\n[NET] IPv4-first DNS: ${typeof getDefaultResultOrder === 'function' && getDefaultResultOrder() === 'ipv4first' ? 'ON ✅' : 'OFF (VPS par IPv6 toota ho sakta hai)'}`);
  console.log('[NET] Database URL test: ' + DB_URL);
  const host = new URL(DB_URL).host;
  try {
    const dns = require('dns').promises;
    const addrs = await dns.lookup(host, { all: true });
    console.log('      DNS ok →', addrs.map(a => a.address).join(', '));
  } catch (error) {
    console.log('      ❌ DNS fail →', error.code || error.message, '\n     → Firebase Console → Realtime Database ka exact URL .env ke FIREBASE_DATABASE_URL me daalein.');
    return;
  }

  // A) Bina token — write (rules lagi ho to 401/403 hona chahiye)
  const unauth = await tryFetch('\n[A] Bina token, root write     ', DB_URL + '/arena_diag.json', { method: 'PUT', body: JSON.stringify({ config: { x: 1 } }) });
  if (unauth) {
    console.log('     HTTP', unauth.status, '(rules lagi ho to 401/403)');
    try { await fetch(DB_URL + '/arena_diag.json', { method: 'DELETE' }); } catch (e) {}
  }

  // B) Token ke saath — config write on own panel (harmless probe field)
  const authed = await tryFetch('[B] TOKEN ke saath config write ', DB_URL + '/zayrobdgwinabiz/config.json?access_token=' + encodeURIComponent(token), {
    method: 'PATCH', body: JSON.stringify({ probeAuth: Date.now() })
  });
  if (!authed) { console.log('\n➡️ Database tak pahunch hi nahi pa rahe — upar ka NET/DNS error dekhein.'); return; }
  const authedText = await authed.text();
  console.log('     HTTP', authed.status, authedText.slice(0, 160));

  // C) Token ke saath — read
  const read = await tryFetch('[C] TOKEN ke saath read        ', DB_URL + '/zayrobdgwinabiz/config.json?access_token=' + encodeURIComponent(token));
  if (read) console.log('     HTTP', read.status);

  console.log('\n═══ RESULT ═══');
  if (authed.status === 200) {
    console.log('✅✅ TOKEN + DATABASE + RULES SAB SAHI HAI — live links feature chalega.');
  } else if (authed.status === 401 || authed.status === 403) {
    console.log('❌ Token sahi, par database RULES is service account ko allow nahi kar rahi.');
    console.log('   Fix: database rules me auth != null par write allow karein, ya');
    console.log('   bash scripts/deploy-rules.sh chalayein (project id .env se).');
  } else if (authed.status === 404) {
    console.log('❌ Ye database is project me hai hi nahi (HTTP 404).');
    console.log('   Fix: Firebase Console → Realtime Database → URL copy karke');
    console.log('   .env ke FIREBASE_DATABASE_URL me daalein (aur location — asia-southeast1 —');
    console.log('   hone par URL aisa hota hai: https://<project>-default-rtdb.asia-southeast1.firebasedatabase.app)');
  } else {
    console.log('⚠️ Unexpected status — upar ka output paste kar dein.');
  }
}

main().catch(e => console.log('ERROR:', describeFetchError(e)));
