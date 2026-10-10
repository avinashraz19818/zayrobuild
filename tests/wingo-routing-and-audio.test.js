const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ensureAudioGate } = require('../utils/apkbuilder');
const { injectParams } = require('../utils/htmlprocessor');

test('ensureAudioGate: cleanly distinguishes wingo from home, and does not block _goState or setBalance', () => {
  const sampleHtml = '<html><head></head><body><div id="app"></div></body></html>';
  const injected = ensureAudioGate(sampleHtml);

  // Checks that wingo is recognized as its own curPage
  assert.match(injected, /curPage="wingo"/);
  assert.match(injected, /isWingo/);

  // Checks that home does NOT claim wingo
  assert.match(injected, /!isWingo/);

  // Checks that returning logged-in users get persistent flag and auto-redirect from register/login
  assert.match(injected, /zayro_user_logged_in/);
  assert.match(injected, /targetDest/);

  // Checks that broken _goState/setBalance blocker is gone
  assert.doesNotMatch(injected, /!__g\.on && __g\.homeTicks<4/);
  assert.doesNotMatch(injected, /DEPOSIT FLASH FIX/);

  // Checks balance scraping on wingo/home
  assert.match(injected, /window\.setBalance\(bval\)/);

  // Checks low balance on wingo plays deposit.mp3
  assert.match(injected, /__play\("deposit\.mp3"\)/);
  assert.match(injected, /__wingoLowPlayed/);
  assert.match(injected, /__resolveSound/);

  // Checks TTS speak hook is preserved
  assert.match(injected, /window\.ZAYRO\.speak/);
});

test('injectParams: routes logged-in users to WINGO_URL and does not block balance with authRoute', () => {
  const sampleHtml = '<html><head></head><body><div id="app"></div></body></html>';
  const params = {
    domain: 'https://testgame.com',
    code: '12345',
    firebasePath: 'orders/test1'
  };
  const processed = injectParams(sampleHtml, params);

  // Check persistent login check
  assert.match(processed, /localStorage\.getItem\(['"]zayro_user_logged_in['"]\)/);

  // Check wrappedSetBalance does not block setBalance
  assert.match(processed, /window\.__zayroAuthRoute=false;\s*return originalSetBalance\.apply\(this,arguments\);/);
});
