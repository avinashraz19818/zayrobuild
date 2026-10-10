'use strict';
// Admin MP3 library: ek hi jagah par saari MP3 files.
//
//  • Kisi bhi naam ki MP3 upload/replace/delete ho sakti hai (jaise deposit.mp3, bypass.mp3,
//    koi nayi file). Naam = file ka base name (lowercase, a-z 0-9 _ -).
//  • Numeric naam (200, 300 …) = deposit amount ki MP3. APK build time par order ke
//    minimum deposit wali amount file successful.mp3 ban jaati hai.
//  • Build time par saari "sound" files (non-numeric) template assets me copy hoti hain,
//    same naam ki purani asset ko replace karke.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const DEFAULT_ROOT = path.join(__dirname, '..', 'runtime', 'mp3-library');
const LEGACY_ROOT = path.join(__dirname, '..', 'runtime', 'deposit-audio'); // purana deposit-only folder
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_AMOUNT = 10000000;
const SOUND_NAME = /^[a-z][a-z0-9_-]{0,39}$/;
const AMOUNT_NAME = /^[1-9]\d{0,7}$/;
const FILE_NAME = /^([a-z0-9][a-z0-9_-]{0,39})\.mp3$/;

function failure(code, message) { const e = new Error(message); e.code = code; return e; }

// Naam ko normalize karke { name, kind, amount } deta hai. "200", "200.mp3", "Deposit.MP3" sab valid.
function parseName(input) {
  const text = String(input ?? '').trim().toLowerCase().replace(/\.mp3$/, '');
  if (AMOUNT_NAME.test(text)) {
    const amount = Number(text);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_AMOUNT) {
      throw failure('INVALID', 'Amount 1 se 10000000 ke beech hona chahiye.');
    }
    return { name: String(amount), kind: 'amount', amount };
  }
  if (!SOUND_NAME.test(text)) {
    throw failure('INVALID', 'Naam sirf chhote letters, numbers, _ ya - me ho (jaise deposit, bypass, 200). Shuru letter se ho.');
  }
  return { name: text, kind: 'sound', amount: null };
}

// Real MP3 only: ID3 tag ya MPEG frame sync, plausible size.
function validMp3(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1000 || bytes.length > MAX_BYTES) return false;
  const id3 = bytes.subarray(0, 3).toString('latin1') === 'ID3';
  const sync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return id3 || sync;
}

function createMp3Library({ root = DEFAULT_ROOT, legacyRoot = null } = {}) {
  // Purana deposit-only folder ho aur naya folder na ho to use naam badal kar le lo (files nahi khoyengi).
  if (legacyRoot && !fs.existsSync(root) && fs.existsSync(legacyRoot)) {
    fs.mkdirSync(path.dirname(root), { recursive: true });
    fs.renameSync(legacyRoot, root);
  }
  const fileFor = (name) => path.join(root, `${name}.mp3`);
  function privateDir() { fs.mkdirSync(root, { recursive: true, mode: 0o700 }); }
  function atomicWrite(file, bytes) {
    privateDir();
    const temp = file + '.' + crypto.randomBytes(8).toString('hex') + '.tmp';
    try { fs.writeFileSync(temp, bytes, { mode: 0o600 }); fs.renameSync(temp, file); }
    finally { try { fs.unlinkSync(temp); } catch {} }
  }
  // Raw entries (build hook bhi use karta hai).
  function entries() {
    let names;
    try { names = fs.readdirSync(root); }
    catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    return names
      .map((n) => ({ n, m: FILE_NAME.exec(n) }))
      .filter((x) => x.m)
      .map(({ n, m }) => {
        const name = m[1];
        const amount = AMOUNT_NAME.test(name) ? Number(name) : null;
        if (amount !== null && (amount < 1 || amount > MAX_AMOUNT)) return null;
        const st = fs.statSync(path.join(root, n));
        return { name, kind: amount !== null ? 'amount' : 'sound', amount, file: n, bytes: st.size, updatedAt: st.mtime.toISOString() };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'amount' ? -1 : 1;
        if (a.kind === 'amount') return a.amount - b.amount;
        return a.name.localeCompare(b.name);
      });
  }
  function list() { return entries(); }
  function save(nameInput, bytes) {
    const { name } = parseName(nameInput);
    if (!validMp3(bytes)) throw failure('INVALID', 'Sirf valid MP3 file dein (8 MB se chhoti).');
    atomicWrite(fileFor(name), bytes);
    return list();
  }
  function read(nameInput) {
    const { name } = parseName(nameInput);
    try { return fs.readFileSync(fileFor(name)); }
    catch (e) { if (e.code === 'ENOENT') throw failure('NOT_FOUND', 'Is naam ki MP3 nahi mili.'); throw e; }
  }
  function remove(nameInput) {
    const { name } = parseName(nameInput);
    try { fs.unlinkSync(fileFor(name)); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    return list();
  }
  return { list, save, read, remove, fileFor, parseName };
}

// Build hook. (1) Har "sound" MP3 template assets me copy (same naam replace).
// (2) Order ke minimum deposit wali amount MP3 successful.mp3 ban jaati hai (amount file ko priority).
function applyMp3Library(order, assetsDir, log = () => {}, { root = DEFAULT_ROOT } = {}) {
  const svc = createMp3Library({ root });
  const copied = [];
  for (const item of svc.list()) {
    const bytes = fs.readFileSync(path.join(root, item.file));
    if (!validMp3(bytes)) continue;
    fs.writeFileSync(path.join(assetsDir, `${item.name}.mp3`), bytes);
    copied.push(item.name);
  }
  if (copied.length) log(`MP3 library: ${copied.map((n) => n + '.mp3').join(', ')} copy hui.`);

  const amount = Number(order?.min_deposit) || 300;
  let bytes = null;
  try { bytes = fs.readFileSync(svc.fileFor(String(amount))); } catch (_) { bytes = null; }
  if (!bytes || !validMp3(bytes)) {
    log(`Deposit MP3 (${amount}.mp3) nahi mili; successful.mp3 jaisa hai rahega.`);
    return { copied, deposit: { applied: false, amount } };
  }
  fs.writeFileSync(path.join(assetsDir, 'successful.mp3'), bytes);
  log(`Deposit MP3 applied: ${amount}.mp3 → successful.mp3`);
  return { copied, deposit: { applied: true, amount } };
}

module.exports = { createMp3Library, applyMp3Library, parseName, validMp3, MAX_BYTES, DEFAULT_ROOT, LEGACY_ROOT };
