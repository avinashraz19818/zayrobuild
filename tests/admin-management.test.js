'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createAdminManagement, idsFrom, coinInput } = require('../utils/admin-management');
const { makePackageName, makeFakePackageName } = require('../utils/package-name');
function fixture(t) {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.pragma('foreign_keys=ON');
  db.exec(`
    CREATE TABLE users(id INTEGER PRIMARY KEY,coins INTEGER,telegram_id TEXT,referred_by INTEGER);
    CREATE TABLE orders(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),status TEXT);
    CREATE TABLE order_fake_sites(id INTEGER PRIMARY KEY,order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,status TEXT);
    CREATE TABLE demo_accounts(id INTEGER PRIMARY KEY,order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE coin_requests(user_id INTEGER REFERENCES users(id));
    CREATE TABLE gift_code_claims(user_id INTEGER REFERENCES users(id));
    CREATE TABLE bot_deploy_requests(user_id INTEGER REFERENCES users(id));
    CREATE TABLE referrals(referrer_id INTEGER REFERENCES users(id),referred_user_id INTEGER REFERENCES users(id));
    CREATE TABLE referral_pending(chat_id TEXT,referrer_id INTEGER);
    CREATE TABLE sessions(sid TEXT,sess TEXT);
    INSERT INTO users VALUES(1,100,'111',NULL),(2,20,'222',1);
    INSERT INTO orders VALUES(1,1,'done'),(2,2,'done');
  `);
  return { db, service: createAdminManagement(db) };
}
test('coin adjustment supports add/subtract/set zero and audit records', t => {
  const { db, service } = fixture(t);
  assert.equal(service.adjustCoins(1, 'add', 10).coins, 110);
  assert.equal(service.adjustCoins(1, 'subtract', 30).coins, 80);
  assert.equal(service.adjustCoins(1, 'set', 0).coins, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM admin_coin_adjustments').get().n, 3);
});
test('invalid and excessive subtraction leaves wallet and audit untouched', t => {
  const { db, service } = fixture(t);
  for (const [action, amount] of [['subtract', 101], ['add', -1], ['add', 1.5], ['invalid', 1], ['set', ''], ['add', Infinity]]) {
    assert.throws(() => service.adjustCoins(1, action, amount));
  }
  assert.throws(() => service.adjustCoins(99, 'add', 1), /not found/);
  assert.equal(db.prepare('SELECT coins FROM users WHERE id=1').get().coins, 100);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM admin_coin_adjustments').get().n, 0);
});
test('bulk order deletion rolls back if any selected build is active or missing', t => {
  const { db, service } = fixture(t);
  db.prepare("UPDATE orders SET status='building' WHERE id=2").run();
  assert.throws(() => service.deleteOrders([1,2]), /cannot be deleted/);
  assert.throws(() => service.deleteOrders([1,99]), /no longer exist/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n, 2);
});
test('extra fake builds also prevent deleting parent order/user', t => {
  const { db, service } = fixture(t);
  db.exec("INSERT INTO order_fake_sites VALUES(1,1,'building')");
  assert.throws(() => service.deleteOrders([1]), /fake APK/);
  assert.throws(() => service.deleteUsers([1]), /fake APK/);
});
test('bulk user deletion handles references, cascades and sessions atomically', t => {
  const { db, service } = fixture(t);
  db.exec(`INSERT INTO coin_requests VALUES(1); INSERT INTO gift_code_claims VALUES(1);
    INSERT INTO bot_deploy_requests VALUES(1); INSERT INTO referrals VALUES(1,2);
    INSERT INTO referral_pending VALUES('111',2); INSERT INTO demo_accounts VALUES(1,1,1);
    INSERT INTO order_fake_sites VALUES(1,1,'done');
    INSERT INTO sessions VALUES('one','{"userId":1}'),('two','{"userId":2}');`);
  assert.throws(() => service.deleteUsers([1,99]), /not found/);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 2);
  const deleted = service.deleteUsers([1]);
  assert.equal(deleted.length, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM users').get().n, 1);
  assert.equal(db.prepare('SELECT referred_by FROM users WHERE id=2').get().referred_by, null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM demo_accounts').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n, 1);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
});
test('selection limits and integer amounts are enforced', () => {
  assert.deepEqual(idsFrom([1,'1',2]), [1,2]);
  for (const bad of [[], ['x'], [true], [null], [-1], [1.5], Array(101).fill(1)]) assert.throws(() => idsFrom(bad));
  assert.throws(() => coinInput('add', false));
});
test('package format is branded, valid and unique by counter', () => {
  assert.equal(makePackageName('ZAYRO', 5), 'zayro.zayro5');
  assert.equal(makePackageName('Venom Cyber', 8), 'zayro.venomcyber8');
  for (const name of ['123', '中文', 'A.-B 😎', 'class', '']) {
    assert.match(makePackageName(name, 2), /^zayro\.[a-z][a-z0-9]*$/);
  }
  assert.notEqual(makePackageName('A', 1), makePackageName('A', 2));
  assert.throws(() => makePackageName('A', -1));
});

test('new fake APKs are branded while legacy fake identity stays unchanged', () => {
  assert.equal(makeFakePackageName('zayro.venom8', 1), 'zayro.venom8f1');
  assert.equal(makeFakePackageName('zayro.venom8', 2), 'zayro.venom8f2');
  assert.equal(makeFakePackageName('com.portal.zayro5', 1), 'com.client.zayro5f1');
});
