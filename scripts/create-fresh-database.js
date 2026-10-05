'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const oldDbPath = path.join(__dirname, '..', 'database', 'apkbuilder.db');
const newDbPath = path.join(__dirname, '..', 'database', 'zayrobuild.db');
const backupPath = path.join(__dirname, '..', 'backups', `apkbuilder_archive_${Date.now()}.db`);

console.log('[1/5] Backing up old database...');
if (fs.existsSync(oldDbPath)) {
  fs.copyFileSync(oldDbPath, backupPath);
  console.log('Archive saved to:', backupPath);
}

// Remove any existing new db to start completely fresh
if (fs.existsSync(newDbPath)) fs.unlinkSync(newDbPath);
const shm = newDbPath + '-shm';
const wal = newDbPath + '-wal';
if (fs.existsSync(shm)) fs.unlinkSync(shm);
if (fs.existsSync(wal)) fs.unlinkSync(wal);

console.log('[2/5] Creating brand new database:', newDbPath);
const newDb = new Database(newDbPath);
newDb.pragma('journal_mode = WAL');
newDb.pragma('foreign_keys = ON');

// Clean Schema
newDb.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    telegram_id TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    email_verified_at INTEGER,
    email_verification_token_hash TEXT,
    email_verification_expires_at INTEGER,
    email_verification_sent_at INTEGER,
    password_reset_token_hash TEXT,
    password_reset_expires_at INTEGER,
    session_version INTEGER NOT NULL DEFAULT 0,
    first_name TEXT DEFAULT '',
    tg_username TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    is_telegram INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_users_telegram_id ON users(telegram_id);

  CREATE TABLE designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_coins INTEGER NOT NULL DEFAULT 10,
    original_price_coins INTEGER DEFAULT 0,
    fake_price_coins INTEGER DEFAULT 5,
    category TEXT DEFAULT 'zayro',
    variant TEXT DEFAULT 'real',
    type TEXT NOT NULL DEFAULT 'normal',
    popup_html_file TEXT NOT NULL,
    fake_popup_html_file TEXT DEFAULT '',
    java_type TEXT NOT NULL DEFAULT 'normal',
    preview_image TEXT,
    preview_video TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE design_preview_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    design_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(design_id) REFERENCES designs(id) ON DELETE CASCADE
  );
  CREATE INDEX idx_design_preview_images_design ON design_preview_images(design_id, sort_order, id);

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    design_id INTEGER NOT NULL,
    app_name TEXT NOT NULL,
    package_name TEXT NOT NULL,
    register_url TEXT NOT NULL,
    deposit_url TEXT NOT NULL,
    wingo_url TEXT NOT NULL,
    domain TEXT NOT NULL,
    firebase_path TEXT NOT NULL,
    min_deposit INTEGER NOT NULL DEFAULT 300,
    brand_title TEXT NOT NULL,
    icon_file TEXT,
    status TEXT DEFAULT 'pending',
    apk_file TEXT,
    fake_register_url TEXT,
    fake_apk_file TEXT,
    fake_firebase_path TEXT,
    live_link_enabled INTEGER NOT NULL DEFAULT 0,
    build_log TEXT,
    coins_spent INTEGER NOT NULL,
    domain_change_count INTEGER DEFAULT 0,
    invite_code_change_count INTEGER DEFAULT 0,
    build_engine TEXT DEFAULT 'flutter',
    app_name_style TEXT DEFAULT 'normal',
    design_variant TEXT DEFAULT 'real',
    coupon_code TEXT DEFAULT '',
    discount_coins INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(design_id) REFERENCES designs(id)
  );

  CREATE TABLE order_fake_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    register_url TEXT NOT NULL,
    deposit_url TEXT,
    wingo_url TEXT,
    domain TEXT,
    firebase_path TEXT,
    apk_file TEXT,
    status TEXT DEFAULT 'pending',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE coin_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    coins_requested INTEGER NOT NULL,
    amount_paid REAL NOT NULL,
    utr TEXT NOT NULL,
    screenshot_file TEXT DEFAULT '',
    telegram_msg_id INTEGER,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires INTEGER NOT NULL
  );
  CREATE INDEX idx_sessions_expires ON sessions(expires);

  CREATE TABLE build_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    firebase_path TEXT NOT NULL,
    key_id TEXT NOT NULL,
    key_secret TEXT NOT NULL,
    engine TEXT NOT NULL DEFAULT 'flutter',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE INDEX idx_build_keys_order ON build_keys(order_id);

  CREATE TABLE coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'fixed',
    value INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE popup_announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    button_text TEXT,
    button_url TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE demo_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_key TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX idx_demo_accounts_order_key ON demo_accounts(order_id, user_key);

  CREATE TABLE blocked_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('[3/5] Migrating 37 app design templates from old database...');
let designCount = 0;
let previewCount = 0;

if (fs.existsSync(oldDbPath)) {
  const oldDb = new Database(oldDbPath, { readonly: true });
  const designs = oldDb.prepare('SELECT * FROM designs').all();
  
  const insertDesign = newDb.prepare(`
    INSERT INTO designs (
      id, name, description, price_coins, original_price_coins, fake_price_coins,
      category, variant, type, popup_html_file, fake_popup_html_file, java_type,
      preview_image, preview_video, active, created_at
    ) VALUES (
      @id, @name, @description, @price_coins, @original_price_coins, @fake_price_coins,
      @category, @variant, @type, @popup_html_file, @fake_popup_html_file, @java_type,
      @preview_image, @preview_video, @active, @created_at
    )
  `);

  const tx = newDb.transaction((rows) => {
    for (const d of rows) {
      insertDesign.run({
        id: d.id,
        name: d.name,
        description: d.description || '',
        price_coins: d.price_coins || 10,
        original_price_coins: d.original_price_coins || 0,
        fake_price_coins: d.fake_price_coins || 5,
        category: d.category || 'zayro',
        variant: d.variant || 'real',
        type: d.type || 'normal',
        popup_html_file: d.popup_html_file || '',
        fake_popup_html_file: d.fake_popup_html_file || '',
        java_type: d.java_type || 'normal',
        preview_image: d.preview_image || '',
        preview_video: d.preview_video || '',
        active: d.active !== undefined ? d.active : 1,
        created_at: d.created_at || new Date().toISOString()
      });
      designCount++;
    }
  });
  tx(designs);

  try {
    const previewImages = oldDb.prepare('SELECT * FROM design_preview_images').all();
    const insertPreview = newDb.prepare(`
      INSERT INTO design_preview_images (id, design_id, file_name, sort_order, created_at)
      VALUES (@id, @design_id, @file_name, @sort_order, @created_at)
    `);
    const ptx = newDb.transaction((rows) => {
      for (const p of rows) {
        insertPreview.run(p);
        previewCount++;
      }
    });
    ptx(previewImages);
  } catch (_) {}

  oldDb.close();
}

console.log(`Migrated ${designCount} designs and ${previewCount} preview images.`);

console.log('[4/5] Initializing fresh settings for ZAYRO BUILD...');
const insertSetting = newDb.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
const initialSettings = [
  ['site_name', 'ZAYRO BUILD'],
  ['telegram_bot_token', '7680072962:AAEO4cnkJqM68LjmLx0wePlky_LPKMlWbZo'],
  ['telegram_admin_id', '8015937475'],
  ['telegram_support_user', '@zayro_o'],
  ['telegram_channel_url', 'https://t.me/nepsxbot'],
  ['telegram_log_channel_id', '-1003906843797'],
  ['telegram_log_enabled', '1'],
  ['upi_id', 'avinash776@ptyes'],
  ['upi_qr_image', '78f7a8cca8ef3f43959111341248f2fb'],
  ['coin_rate', '1'],
  ['addon_fake_price', '5'],
  ['domain_change_price', '10'],
  ['invite_code_change_price', '10'],
  ['loading_html_file', 'redload.html'],
  ['site_url', 'https://devlopedwithzayro.site'],
  ['backup_keep_count', '10']
];

for (const [k, v] of initialSettings) {
  insertSetting.run(k, v);
}

console.log('[5/5] Creating primary admin user: shruti...');
newDb.prepare(`
  INSERT INTO users (
    username, email, password, coins, auth_provider, email_verified_at
  ) VALUES (
    ?, ?, ?, ?, 'password', ?
  )
`).run(
  'shruti',
  'admin@zayrobuild.com',
  '$2a$12$7sAX2IGhZNQFH.MZ1QtjJek8ItlsOVK1DT4amtd7KbPllQRhQuqie', // shruti123
  999999,
  Date.now()
);

newDb.close();
console.log('[COMPLETE] New database zayrobuild.db has been successfully created!');
