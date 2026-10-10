'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {plain}=require('../utils/telegram-presentation');
const { __test: { deliverApkReady } } = require('../utils/telegram');
for (const fake of [false, true]) {
  test(`short delivery copy, escaped names, ${fake ? 'fake' : 'real'} caption`, async t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-test-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const apk = path.join(dir, 'App.apk'); fs.writeFileSync(apk, 'fixture');
    const messages = [], documents = [], edits = [];
    const sender = {
      async sendMessage(id, text) { messages.push(plain(text)); return { message_id: 1 }; },
      async sendDocument(id, file, options) { documents.push(plain(options.caption)); },
      async editMessageText(text) { edits.push(plain(text)); }
    };
    await deliverApkReady(sender, { telegram_id: '123' }, { app_name: 'A<b>', package_name: 'secret.package', is_fake: fake }, [apk], []);
    assert.equal(documents.length, 1);
    assert.match(documents[0], fake ? /Fake APK/ : /Real APK/);
    assert.match(messages[0], /A&lt;b&gt;/);
    assert.match(edits[0], /1 APK file\(s\) delivered/);
    assert.doesNotMatch(edits[0], /Sending your/);
    assert.doesNotMatch([...messages, ...documents, ...edits].join('\n'), /secret\.package|Protection|Dex Protect|100%|5s|scan recommended/i);
  });
}
test('partial delivery reports incomplete upload, not all-delivered success', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-partial-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const apk = path.join(dir, 'App.apk'); fs.writeFileSync(apk, 'fixture');
  let final = '';
  await deliverApkReady({
    async sendMessage() { return { message_id: 1 }; },
    async sendDocument() { throw new Error('test delivery failure'); },
    async editMessageText(text) { final = plain(text); }
  }, { telegram_id: '123' }, { app_name: 'App' }, [apk], []);
  assert.match(final, /0\/1 APK file\(s\) sent/);
  assert.match(final, /remaining files/);
});
