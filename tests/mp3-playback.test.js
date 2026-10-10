'use strict';
// Har sound jo game templates bajate hain, APK build me bundled hona chahiye.
// Ye test naya missing sound, stale Android copy aur galat MP3 header pakdta hai.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { mapResultSpeechToSound } = require('../utils/apkbuilder');
const { validMp3 } = require('../utils/mp3-library');

const ROOT = path.join(__dirname, '..');
const SHARED = path.join(ROOT, 'templates', 'assets');
const TEMPLATES = path.join(ROOT, 'templates');
const bundled = fs.readdirSync(SHARED).filter((f) => f.endsWith('.mp3'));
const ALIAS = { 'loginw.mp3': 'bypass.mp3' }; // MainActivity me ye naam bypass.mp3 par jaata hai

test('core game sounds are all present in the shared assets', () => {
  for (const name of ['big.mp3', 'small.mp3', 'register.mp3', 'successful.mp3', 'lowbalance.mp3', 'deposit.mp3', 'bypass.mp3', 'low_deposit.mp3']) {
    assert.ok(bundled.includes(name), `${name} missing in templates/assets`);
  }
});

test('every MP3 a template plays is bundled (no silent sound on device)', () => {
  const missing = [];
  for (const f of fs.readdirSync(TEMPLATES).filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(TEMPLATES, f), 'utf8');
    for (const m of html.matchAll(/["']([A-Za-z0-9_-]+\.mp3)["']/g)) {
      const name = ALIAS[m[1].toLowerCase()] || m[1];
      if (!bundled.includes(name)) missing.push(`${f}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('shared MP3s have valid MP3 headers', () => {
  for (const f of bundled) {
    assert.ok(validMp3(fs.readFileSync(path.join(SHARED, f))), `${f} is not a valid MP3`);
  }
});

test('Android bundled MP3s are identical to the shared copies (no stale files)', () => {
  for (const dir of ['android-project/app/src/main/assets']) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith('.mp3'))) {
      assert.ok(bundled.includes(f), `${dir}/${f} has no shared copy`);
      assert.ok(
        fs.readFileSync(path.join(ROOT, dir, f)).equals(fs.readFileSync(path.join(SHARED, f))),
        `${dir}/${f} differs from templates/assets/${f}`
      );
    }
  }
});

test('result speech preserves TTS speak and also triggers big/small MP3', () => {
  const out = mapResultSpeechToSound('try{window.ZAYRO.speak(row.size+" "+row.number);}catch(e){}');
  assert.match(out, /ZAYRO\.speak\(row\.size\+" "\+row\.number\)/);
  assert.match(out, /ZAYRO\.playSound\(row\.size==="BIG"\?"big\.mp3":"small\.mp3"\)/);
});

test('templates that already play big.mp3/small.mp3 are left untouched (no double play)', () => {
  const src = "ZAYRO.speak(finalPred.s+' '+finalPred.n); playAudio(finalPred.s==='BIG'?'big.mp3':'small.mp3');";
  assert.equal(mapResultSpeechToSound(src), src);
});

test('template speech call is preserved for TTS and complemented with sound', () => {
  const f = path.join(TEMPLATES, 'fake_1791007278508_NUMBER_V4_API_RESULT_ICONS_FINAL.html');
  const out = mapResultSpeechToSound(fs.readFileSync(f, 'utf8'));
  assert.match(out, /ZAYRO\.speak\(row\.size\+" "\+row\.number\)/);
  assert.match(out, /ZAYRO\.playSound\(row\.size==="BIG"\?"big\.mp3":"small\.mp3"\)/);
});
