const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

let bot = null;
let websiteStore = null;
let deliveryBot = null;
let pollingAgent = null;
let deliveryAgent = null;
let apkDeliveryQueue = Promise.resolve();
let _db  = null;
let broadcastController = null;
const {panelLink}=require('./panel-links');

// Shared message styling: native bold text, custom emoji entities, clean labels.
const presentation=require('./telegram-presentation');
const PE_ID=presentation.IDS;
const fallbackGlyphs={wave:'👋',gift:'🎁',star:'⭐',fire:'🔥',crown:'👑',diamond:'💎',money:'💰',check:'✅',alert:'‼️',lock:'🔒',sparkles:'✨',rocket:'🚀',bell:'🔔',dot:'🔘',down:'🔽',party:'🥳',bot:'🤖',stats:'📊',phone:'📞',arrow:'👉',verified:'✔️',card:'📇',telegram:'✈️',mobile:'📱',trophy:'🏆',user:'👤',gear:'⚙️',broadcast:'📡'};
const PE=Object.fromEntries(Object.entries(PE_ID).map(([key,id])=>[key,`<tg-emoji emoji-id="${id}">${fallbackGlyphs[key]}</tg-emoji>`]));

// Ye hosts "temporary tunnel" hote hain — band hone par dead ho jaate hain (ERR_NAME_NOT_RESOLVED).
// Purane trycloudflare/ngrok links DB me pade reh jaate hain, isliye unhe last option rakhte hain.
const TEMP_TUNNEL_HOSTS = [
  'trycloudflare.com', 'ngrok.io', 'ngrok-free.app', 'ngrok.app',
  'loca.lt', 'localtunnel.me', 'serveo.net', 'localhost.run', 'tunnelmole.net'
];

function isTemporaryTunnel(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TEMP_TUNNEL_HOSTS.some(t => host === t || host.endsWith('.' + t));
  } catch (_) {
    return false;
  }
}

function readSetting(key) {
  try {
    const v = _db?.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;
    return v && String(v).trim() ? String(v).trim().replace(/\/+$/, '') : '';
  } catch (_) {
    return '';
  }
}

// Mini App ka URL. Pehle Admin → Settings wali value (taaki panel se hi badal sakein),
// uske baad .env ka SITE_URL, warna default. Temporary tunnel URL ho to usse peeche rakhte hain.
function getSiteUrl() {
  const candidates = [
    readSetting('site_url'),
    String(process.env.SITE_URL || '').trim().replace(/\/+$/, ''),
    String(process.env.BASE_URL || '').trim().replace(/\/+$/, '')
  ].filter(Boolean);

  const permanent = candidates.find(u => !isTemporaryTunnel(u));
  if (permanent) return permanent;
  if (candidates.length) return candidates[0];
  return 'https://jaiclub5vip.site';
}

// Compatibility function name retained for existing callers. Labels use sans-serif bold-italic display letters.
function toSansBoldItalic(str) { return presentation.buttonText(str); }
function boldNum(value) { return String(value ?? ''); }

// Custom icons belong in icon_custom_emoji_id, never in button text.
// Unsupported clients receive clean text-only buttons, not static replacement emoji.
function premiumButtonRows(rows, { withIcons = true, withStyle = true } = {}) {
  return rows.map((row) => row.map((btn) => {
    const { icon, emoji, ...rest } = btn;
    const out = { ...rest, text:presentation.buttonText(rest.text) };
    if(out.web_app?.url){try{const target=new URL(out.web_app.url).hash.slice(1);const normalized=panelLink(out.web_app.url,target);if(normalized)out.web_app={url:normalized};}catch{}}
    if (!withStyle) delete out.style;
    if (withIcons) out.icon_custom_emoji_id = String(icon || rest.icon_custom_emoji_id || presentation.iconFor(emoji || rest.text));
    else delete out.icon_custom_emoji_id;
    return out;
  }));
}

// Retry only confirmed feature rejection: icons + style → text + style → text only.
async function sendWithFallback(sendFn, rows) {
  const attempts = [
    { withIcons: true, withStyle: true },
    { withIcons: false, withStyle: true },
    { withIcons: false, withStyle: false }
  ];
  let lastError = null;
  for (const opts of attempts) {
    try {
      return await sendFn({ inline_keyboard: premiumButtonRows(rows, opts) });
    } catch (error) {
      lastError = error;
      // Retry only a definite keyboard-feature rejection, never timeouts/429/blocked users.
      const body=error.response?.body;
      if(body?.error_code!==400||!/(icon_custom_emoji|button.*style|style.*button|BUTTON_TYPE_INVALID|custom emoji)/i.test(body.description||''))throw error;
      // A rejected icon affects this send only, not every later message.
    }
  }
  throw lastError;
}

/** Naya premium message (text + buttons) bhejo. */
async function sendPremium(chatId, html, rows, extra = {}) {
  const {templateKey,...sendExtra}=extra;
  const original={html,rows};
  const edited=require('./bot-message-editor').apply(_db,templateKey,html,rows,getSiteUrl());
  html=edited.html;rows=edited.rows;
  const attempt=()=> sendWithFallback((reply_markup) => bot.sendMessage(chatId, html, {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...sendExtra,
    reply_markup
  }), rows);
  try{return await attempt();}catch(error){if((html!==original.html||rows!==original.rows)&&error.response?.body?.error_code===400){html=original.html;rows=original.rows;return attempt();}throw error;}
}


function generateTelegramAuthLink(chatId, subPath = '') {
  const siteUrl = getSiteUrl();
  const token = _db?.prepare("SELECT value FROM settings WHERE key='telegram_bot_token'").get()?.value || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const time = Date.now();
  const sig = crypto.createHmac('sha256', token).update(`${chatId}:${time}`).digest('hex');
  const redirectParam = subPath ? `&redirect=${encodeURIComponent(subPath)}` : '';
  return `${siteUrl}/auth/tg?id=${chatId}&time=${time}&token=${sig}${redirectParam}`;
}

function getSupportUrl() {
  if (!_db) return 'https://t.me/';
  const sup = _db.prepare("SELECT value FROM settings WHERE key='telegram_support_user'").get()?.value;
  if (sup && sup.trim()) {
    const clean = sup.trim().replace(/^@/, '');
    return `https://t.me/${clean}`;
  }
  const adminId = _db.prepare("SELECT value FROM settings WHERE key='telegram_admin_id'").get()?.value;
  if (adminId && adminId.trim()) return `tg://user?id=${adminId.trim()}`;
  return 'https://t.me/';
}

/**
 * Ye chat admin ki hai? (settings.telegram_admin_id ya TELEGRAM_ADMIN_CHAT_ID se)
 * Admin ko bot me `/admin` command par direct Admin Panel button milta hai.
 */
function isAdminChat(chatId) {
  try {
    const fromDb = _db?.prepare("SELECT value FROM settings WHERE key='telegram_admin_id'").get()?.value;
    const ids = String(fromDb || process.env.TELEGRAM_ADMIN_CHAT_ID || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return false;
    // Admin kisi group me bhi ho sakta hai — isliye supergroup ke -100 prefix wale ids bhi match karo
    const me = String(chatId || '').trim();
    const bare = me.replace('-100', '');
    return ids.some(id => id === me || id.replace('-100', '') === bare);
  } catch (_) {
    return false;
  }
}

function getChannelUrl() {
  if (!_db) return 'https://t.me/';
  const ch = _db.prepare("SELECT value FROM settings WHERE key='telegram_channel_url'").get()?.value;
  return (ch && ch.trim()) ? ch.trim() : 'https://t.me/';
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

/**
 * /start ka premium welcome message.
 * Content: header → welcome + TG id → engine status/coins/APKs → features.
 */
function buildStartMessage({ firstName = 'Member', chatId = '', userCoins = 0, userOrders = 0, referralApplied = false } = {}) {
  const balance=Number(userCoins||0).toLocaleString('en-IN',{maximumFractionDigits:2});
  return `${PE.crown} <b>ZAYRO BUILD</b>
<blockquote><b>YOUR PREMIUM BUILD STUDIO</b></blockquote>

${PE.wave} <b>Welcome, ${escapeHtml(presentation.plain(firstName))}</b>
${PE.user} <b>Telegram ID</b> · <code>${escapeHtml(chatId)}</code>

${PE.check} <b>Build engine · ONLINE</b>
${PE.money} <b>Wallet · ₹${balance}</b>
${PE.mobile} <b>APKs built · ${Number(userOrders||0)}</b>

${PE.rocket} <b>CREATE. LAUNCH. GROW.</b>
${PE.sparkles} <b>Custom APKs · Instant website accounts</b>
${PE.bot} <b>Welcome bots · Easy renewals</b>

<b>Choose a service below to get started.</b>${referralApplied?`\n\n${PE.gift} <b>Referral recorded. Check your wallet for updates.</b>`:''}`;
}

/**
 * /start ke premium buttons.
 * "My Orders" / "Add Funds" buttons jaan-boojh kar nahi hain (user request) —
 * sirf Builder Panel (+ admin ke liye Admin Panel) aur Support/Channel.
 */
function buildStartButtons({ siteUrl, supportUrl, channelUrl } = {}) {
  // Admin panel ka button yahan jaan-boojh kar NAHI hai — admin ke liye bot me
  // alag se /admin command hai (panel sirf usi raste se khulta hai).
  return [
    [{ text: toSansBoldItalic('Open Builder Panel'), emoji: '🚀', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' }],
    [{text:toSansBoldItalic('Fake Websites'),emoji:'🌐',icon:PE_ID.diamond,style:'primary',web_app:{url:panelLink(siteUrl,'fakesite')}},{text:toSansBoldItalic('Deploy Bot'),emoji:'🤖',icon:PE_ID.bot,style:'success',web_app:{url:panelLink(siteUrl,'deploy')}}],
    [
      { text: toSansBoldItalic('Admin Support'), emoji: '👨‍💻', icon: PE_ID.phone, url: supportUrl, style: 'primary' },
      { text: toSansBoldItalic('Official Channel'), emoji: '📢', icon: PE_ID.broadcast, url: channelUrl, style: 'primary' }
    ]
  ];
}

// Telegram menu buttons have no custom-emoji/HTML entities field. Sans-bold-italic label only.
function buildMenuButton(siteUrl){return {type:'web_app',text:presentation.buttonText('Open Panel'),web_app:{url:siteUrl}};}

function initBot(token, db) {
  if (db) _db = db;
  try {
    if (bot) {
      try { bot.stopPolling({ cancel: true, reason: 'Bot reconfigured' }).catch(() => {}); }
      catch (_) {}
    }
    broadcastController?.stop();
    broadcastController = null;
    bot = null;
    deliveryBot = null;
    pollingAgent?.destroy();
    deliveryAgent?.destroy();
    pollingAgent = null;
    deliveryAgent = null;

    if (!token || !String(token).trim()) return;

    const cleanToken = String(token).trim();

    pollingAgent = new https.Agent({ keepAlive: true, maxSockets: 4 });
    deliveryAgent = new https.Agent({ keepAlive: true, maxSockets: 2 });
    bot = new TelegramBot(cleanToken, {
      polling: { interval: 200, params: { timeout: 10 } },
      request: { agent: pollingAgent, timeout: 30_000 }
    });
    deliveryBot = new TelegramBot(cleanToken, {
      polling: false,
      request: { agent: deliveryAgent, timeout: 10 * 60_000 }
    });

    presentation.install(bot);
    presentation.install(deliveryBot);

    bot.getMe().then(me => {
      console.log(`[Telegram Bot] Connected and polling: @${me.username} (${me.first_name}) [ID: ${me.id}]`);
      // Bot ka Menu Button (left side wala "Open Panel") bhi panel URL par set kar do —
      // warna BotFather me purana/dead URL pada rehta hai aur Mini App nahi khulta.
      if (process.env.BOT_DISABLE_MENU_BUTTON !== '1') {
        const siteUrl = getSiteUrl();
        if (/^https:\/\//i.test(siteUrl)) {
          fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              menu_button: buildMenuButton(siteUrl)
            }),
            signal: AbortSignal.timeout(15_000)
          }).then(async r => {
            const j = await r.json().catch(() => ({}));
            if (j && j.ok) console.log(`[Telegram Bot] Menu button set → ${siteUrl}`);
            else console.log(`[Telegram Bot] Menu button set nahi hua: ${JSON.stringify(j).slice(0, 120)}`);
          }).catch(e => console.log('[Telegram Bot] Menu button set nahi hua:', e.message));
        }
      }
      // Referral link ke liye bot username ko settings me save kar lo
      // (panel isi se t.me/<bot>?start=ref_<code> link banata hai).
      try {
        if (me?.username && _db) {
          _db.prepare("INSERT INTO settings(key,value) VALUES('telegram_bot_username',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
            .run(String(me.username));
        }
      } catch (_) {}
    }).catch(err => {
      console.error(`[Telegram Bot] Connection error:`, err.message);
    });

    // Network polling errors (server pe outbound TLS block / flaky DNS) hamesha
    // flood karte hain — isliye max 1 line per minute, warna log spam ho jata hai
    // aur asli errors chhup jate hain.
    let _lastFatalLog = 0;
    bot.on('polling_error', (err) => {
      if (err?.code === 'EFATAL') {
        const now = Date.now();
        if (now - _lastFatalLog > 60000) {
          _lastFatalLog = now;
          console.error('[Telegram Bot] Polling network error (outbound TLS blocked? bot will auto-retry):', err.message);
        }
      }
    });

    // ── /start Handler — Ultra-Premium Seamless VIP Hub ──
    bot.onText(/^\/start(?:@\w+)?(?:\s|$)/, async (msg) => {
      const chatId    = String(msg.chat.id);
      const rawUsername = msg.from?.username ? msg.from.username.trim() : '';
      const firstName = msg.from?.first_name || 'VIP Member';   // builder HTML-escape karta hai
      const siteUrl   = getSiteUrl();
      const supportUrl = getSupportUrl();
      const channelUrl = getChannelUrl();

      // ── Referral capture: /start ref_<code> ──
      // Yahan sirf pending record hota hai; coins tab credit hote hain jab ye
      // user pehli baar panel (Mini App) me login karta hai (server side).
      let referralApplied = false;
      const startMatch = /^\/start(?:@\w+)?\s+(\S+)/.exec(String(msg.text || '').trim());
      const startPayload = startMatch ? startMatch[1] : '';
      if (require('./store-summary').referralsEnabled() && startPayload && /^ref[_-]/i.test(startPayload) && _db) {
        try {
          const code = startPayload.replace(/^ref[_-]/i, '').toUpperCase();
          const referrer = _db.prepare('SELECT id, telegram_id FROM users WHERE UPPER(referral_code)=?').get(code);
          if (referrer && String(referrer.telegram_id || '') !== chatId) {
            _db.prepare(`
              INSERT INTO referral_pending(chat_id,referrer_id,code,created_at)
              VALUES(?,?,?,CURRENT_TIMESTAMP)
              ON CONFLICT(chat_id) DO UPDATE SET referrer_id=excluded.referrer_id, code=excluded.code
            `).run(chatId, referrer.id, code);
            referralApplied = true;
          }
        } catch (e) {
          console.error('[referral] start capture error:', e.message);
        }
      }

      let userCoins = 0;
      let userOrders = 0;

      // ── Auto-Register / Sync User on Telegram Start ──
      if (_db) {
        try {
          let u = _db.prepare('SELECT * FROM users WHERE telegram_id=?').get(chatId);
          if (!u) {
            let finalUsername = rawUsername || `tg_${chatId}`;
            let attempt = 1;
            while (_db.prepare('SELECT 1 FROM users WHERE username=?').get(finalUsername)) {
              finalUsername = `${rawUsername || `tg_${chatId}`}_${attempt++}`;
            }
            const email = `${chatId}@telegram.user`;
            const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('base64url'), 12);
            const result = _db.prepare(`
              INSERT INTO users(
                username,email,password,auth_provider,email_verified_at,
                coins,telegram_id,first_name,tg_username,is_telegram
              ) VALUES(?,?,?,'telegram',?,0,?,?,?,1)
            `).run(finalUsername, email, passwordHash, Date.now(), chatId, msg.from?.first_name || '', rawUsername);
            u = _db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);
            sendLogEvent('user_registered', {
              id: u.id,
              username: u.username,
              email: u.email,
              coins: 0,
              ip: 'Telegram Bot'
            });
          } else {
            _db.prepare('UPDATE users SET first_name=?, tg_username=? WHERE id=?').run(
              msg.from?.first_name || u.first_name || '',
              rawUsername || u.tg_username || '',
              u.id
            );
          }
          userCoins = u.coins || 0;
          const oc = _db.prepare('SELECT count(*) as c FROM orders WHERE user_id=?').get(u.id);
          userOrders = oc?.c || 0;
        } catch (e) {
          console.error('User sync error:', e.message);
        }
      }

      const welcomeMsg = buildStartMessage({
        firstName, chatId, userCoins, userOrders, referralApplied
      });
      const startButtons = buildStartButtons({
        siteUrl, supportUrl, channelUrl
      });

      try {
        await sendPremium(chatId, welcomeMsg, startButtons,{templateKey:'welcome'});
      } catch (e) {
        console.error('Bot /start error:', e.message);
      }
    });

    require('./site-stock-bot').register(bot,()=>websiteStore,()=>_db?.prepare("SELECT value FROM settings WHERE key='telegram_admin_id'").get()?.value||process.env.TELEGRAM_ADMIN_CHAT_ID||'',{sendStyled:(id,text,rows)=>sendPremium(id,`${PE.lock} <b>WEBSITE STOCK DESK</b>\n\n${escapeHtml(text)}`,rows||[[{text:'Add Accounts',emoji:'🔑',style:'primary',callback_data:'ws:add'}]])});
    broadcastController=require('./broadcast-bot').register(bot,_db,()=>readSetting('telegram_admin_id')||process.env.TELEGRAM_ADMIN_CHAT_ID||'',{sendPremium:(id,html,rows)=>sendPremium(id,html,rows,{templateKey:false}),sendWithFallback,getSiteUrl});
    require('./bot-message-editor').register(bot,_db,()=>readSetting('telegram_admin_id')||process.env.TELEGRAM_ADMIN_CHAT_ID||'',{sendPremium,getSiteUrl});

    // ── /orders command ──
    // ── /admin — sirf admin chat ko dikhta hai (panel /admin URL par khulta hai) ──
    bot.onText(/^\/admin(?:@\w+)?(?:\s|$)/, async (msg) => {
      const chatId = String(msg.chat.id);
      if (!isAdminChat(chatId)) return;   // normal users ko kuch nahi milta
      const siteUrl = getSiteUrl();
      try {
        await sendPremium(chatId,
          `${PE.gear} <b>Admin Panel</b>\n\n` +
          `Sirf aapke liye — neeche button dabakar panel kholein aur admin credentials daalein.\n` +
          `<i>Private administration · secure access</i>`,
          [[
            { text: toSansBoldItalic('Open Admin Panel'), emoji: '🛡️', icon: PE_ID.gear, web_app: { url: `${siteUrl}/admin` }, style: 'danger' }
          ], [
            { text: 'Add Accounts', callback_data: 'ws:add', emoji:'🔑', style:'primary' },
            { text: 'Message Studio', callback_data: 'me:menu', emoji:'✏️', style:'primary' }
          ], [
            { text: 'Broadcast Studio', callback_data: 'bc:new', emoji:'📡', icon:PE_ID.broadcast, style:'success' }
          ], [
            { text: toSansBoldItalic('Open Builder Panel'), emoji: '🚀', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' }
          ]]);
      } catch (error) {
        console.error('[Telegram Bot] /admin reply fail:', error.message);
      }
    });

    bot.onText(/^\/(?:orders|myorders)(?:@\w+)?(?:\s|$)/, async (msg) => {
      const chatId = String(msg.chat.id);
      const siteUrl = getSiteUrl();
      if (!_db) return;

      try {
        const u = _db.prepare('SELECT id, username FROM users WHERE telegram_id=?').get(chatId);
        if (!u) {
          return sendPremium(chatId,
            `${PE.alert} <b>Account not found</b>\nTap /start to register automatically.`,
            [[{ text: toSansBoldItalic('Open Builder Panel'), emoji: '🚀', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' }]],{templateKey:'orders'});
        }

        const orders = _db.prepare('SELECT id, app_name, status, created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 5').all(u.id);
        if (!orders.length) {
          return sendPremium(chatId,
            `${PE.mobile} <b>No orders yet!</b>\nYou haven't created any APK orders yet. Tap below to create your first app.`,
            [[{ text: toSansBoldItalic('Build First APK'), emoji: '🛠️', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' }]],{templateKey:'orders'});
        }

        let txt = `${PE.mobile} <b>Your Recent Orders (${orders.length}):</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        orders.forEach(o => {
          const st = o.status === 'done' ? `${PE.check} Ready` : o.status === 'failed' ? `${PE.alert} Failed` : `${PE.dot} Building`;
          txt += `${PE.dot} <b>#${o.id} - ${escapeHtml(o.app_name)}</b>\n  Status: ${st} | ${PE.card} <code>${new Date(o.created_at).toLocaleDateString()}</code>\n\n`;
        });
        txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        await sendPremium(chatId, txt, [
          [{ text: toSansBoldItalic('Manage In Web App'), emoji: '📱', icon: PE_ID.mobile, web_app: { url: panelLink(siteUrl,'orders') }, style: 'primary' }]
        ],{templateKey:'orders'});
      } catch (e) {
        console.error('Bot /orders error:', e.message);
      }
    });

    // ── /wallet or /coins command ──
    bot.onText(/^\/(?:wallet|coins|balance|deposit)(?:@\w+)?(?:\s|$)/, async (msg) => {
      const chatId = String(msg.chat.id);
      const siteUrl = getSiteUrl();
      if (!_db) return;

      try {
        const u = _db.prepare('SELECT id, coins FROM users WHERE telegram_id=?').get(chatId);
        const coins = u?.coins || 0;
        const upiId = _db.prepare("SELECT value FROM settings WHERE key='upi_id'").get()?.value || '';

        const txt =
`╔══════════════════════════════════╗
║  ${PE.money} <b>𝐘𝐎𝐔𝐑 𝐖𝐀𝐋𝐋𝐄𝐓 &amp; 𝐁𝐀𝐋𝐀𝐍𝐂𝐄</b> ${PE.money}  ║
╚══════════════════════════════════╝

${PE.diamond} <b>Available Balance:</b> <code>₹${coins}</code>
${upiId ? `${PE.card} <b>UPI ID:</b> <code>${escapeHtml(upiId)}</code>\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.fire} <i>Deposit credits instantly to build your modded APKs.</i>`;

        await sendPremium(chatId, txt, [
          [{ text: toSansBoldItalic('Add Funds'), emoji: '💰', icon: PE_ID.money, web_app: { url: panelLink(siteUrl,'wallet') }, style: 'success' }]
        ],{templateKey:'wallet'});
      } catch (e) {
        console.error('Bot /wallet error:', e.message);
      }
    });

    // ── /help command — Play Protect & Install Guide ──
    bot.onText(/^\/(?:help|guide)(?:@\w+)?(?:\s|$)/, async (msg) => {
      const chatId = String(msg.chat.id);
      const helpMsg = `${PE.mobile} <b>Install your APK</b>\nDownload the attached file and follow Android’s installation prompts.\nKeep Play Protect enabled. If Android flags the app, stop and contact support.`;

      await sendPremium(chatId, helpMsg, [
        [{ text: toSansBoldItalic('Contact Support'), emoji: '👨‍💻', icon: PE_ID.phone, url: getSupportUrl(), style: 'primary' }]
      ],{templateKey:'help'});
    });

    // Approve / Reject button callbacks
    bot.on('callback_query', async (query) => {
      const data   = query.data || '';
      if (data.startsWith('ws:')||data.startsWith('bc:')||data.startsWith('me:')) return; // handled by private stock-import controller
      const chatId = query.message?.chat?.id;
      const msgId  = query.message?.message_id;

      if (!_db) {
        try { await bot.answerCallbackQuery(query.id, { text: '⚠️ Server not ready' }); } catch(_) {}
        return;
      }

      if (data.startsWith('approve_') || data.startsWith('reject_')) {
        const {isPaymentAdmin,decidePayment}=require('./payment-decisions');
        // Authenticate the clicking person, not the destination group/chat.
        if(!isPaymentAdmin(query.from?.id,readSetting('telegram_admin_id')||process.env.TELEGRAM_ADMIN_CHAT_ID)){
          try{await bot.answerCallbackQuery(query.id,{text:'Admin access required.',show_alert:true});}catch{}return;
        }
        if(!/^(approve|reject)_\d+$/.test(data))return;
        const action = data.startsWith('approve_') ? 'approve' : 'reject';
        const reqId  = parseInt(data.split('_')[1]);
        let result;
        try{result=decidePayment(_db,reqId,action,`telegram:${query.from.id}`);}catch{try{await bot.answerCallbackQuery(query.id,{text:'Could not process payment. Check status before retrying.'});}catch{}return;}
        if(result.error){try{await bot.answerCallbackQuery(query.id,{text:result.error});}catch{}return;}
        const row=result.row;
        if (action === 'approve') {
          try {
            await bot.answerCallbackQuery(query.id, { text: `✅ Approved +₹${row.coins_requested}!` });
            const cap =
`${PE.check} <b>DEPOSIT REQUEST APPROVED</b> ${PE.money}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.user} <b>User:</b> <code>#${row.user_id}</code>
${PE.money} <b>Amount Added:</b> <b>+₹${row.coins_requested}</b>
${PE.gift} <b>Amount Paid:</b> ₹${row.amount_paid}
${PE.verified} <b>UTR:</b> <code>${escapeHtml(row.utr)}</code>
${PE.dot} <b>Request ID:</b> <code>#${reqId}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            await bot.editMessageCaption(cap, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' })
              .catch(() => bot.editMessageText(cap, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }));

            // Notify user directly
            const targetUser = _db.prepare('SELECT telegram_id, coins FROM users WHERE id=?').get(row.user_id);
            if (targetUser?.telegram_id) {
              const userNotice =
`╔══════════════════════════════════╗
║  ${PE.party} <b>𝐂𝐎𝐈𝐍 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃!</b> ${PE.money}  ║
╚══════════════════════════════════╝

${PE.check} <b>+₹${row.coins_requested}</b> have been added to your account!
${PE.money} <b>Current Balance:</b> <code>₹${targetUser.coins}</code>
${PE.verified} <b>UTR / Ref:</b> <code>${escapeHtml(row.utr)}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.rocket} <i>Aapka balance update ho chuka hai. Ab aap instant APK build kar sakte hain!</i>`;

              sendPremium(targetUser.telegram_id, userNotice, [
                [{ text: toSansBoldItalic('Open Builder Panel'), emoji: '🚀', icon: PE_ID.rocket, web_app: { url: getSiteUrl() }, style: 'success' }],
                [{ text: toSansBoldItalic('Add Funds'), emoji: '💰', icon: PE_ID.money, web_app: { url: panelLink(getSiteUrl(),'wallet') }, style: 'primary' }]
              ],{templateKey:'payment-approved'}).catch(() => {});
            }
          } catch(_) {}
        } else {

          try {
            await bot.answerCallbackQuery(query.id, { text: '❌ Request rejected' });
            const cap =
`${PE.alert} <b>DEPOSIT REQUEST REJECTED</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.user} <b>User:</b> <code>#${row.user_id}</code>
${PE.verified} <b>UTR:</b> <code>${escapeHtml(row.utr)}</code>
${PE.dot} <b>Request ID:</b> <code>#${reqId}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
            await bot.editMessageCaption(cap, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' })
              .catch(() => bot.editMessageText(cap, { chat_id: chatId, message_id: msgId, parse_mode: 'HTML' }));

            const targetUser = _db.prepare('SELECT telegram_id FROM users WHERE id=?').get(row.user_id);
            if (targetUser?.telegram_id) {
              const userNotice =
`╔══════════════════════════════════╗
║  ${PE.alert} <b>𝐂𝐎𝐈𝐍 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 𝐔𝐏𝐃𝐀𝐓𝐄</b> ${PE.alert}  ║
╚══════════════════════════════════╝

${PE.alert} <b>Deposit Request #${reqId} could not be approved.</b>
${PE.verified} <b>UTR:</b> <code>${escapeHtml(row.utr)}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Agar aapne payment ki hai to please payment screenshot ke saath <b>Admin Support</b> se contact karein.`;

              sendPremium(targetUser.telegram_id, userNotice, [[
                { text: toSansBoldItalic('Contact Admin Support'), emoji: '👨‍💻', icon: PE_ID.phone, url: getSupportUrl(), style: 'primary' }
              ]],{templateKey:'payment-rejected'}).catch(() => {});
            }
          } catch(_) {}
        }
      }
    });

    // Doosra duplicate guard — upar wala handler genuine polling failures already
    // log karta hai (throttled). Yahan sirf real Telegram API errors dikhaye jate
    // hain, network/TLS noise suppress.
    bot.on('polling_error', (err) => {
      const msg = err?.message || '';
      const isNetworkNoise = /TLS|EFATAL|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up/i.test(msg);
      if (!msg.includes('ETELEGRAM') && !isNetworkNoise) console.error('Bot polling error:', msg);
    });

  } catch (e) {
    console.error('Telegram bot init failed:', e.message);
  }
}

// ── Send Coin Request to Admin with Rich Styling ──
async function sendCoinRequest(adminChatId, user, request, screenshotPath) {
  if (!bot || !adminChatId) return null;

  const msg =
`╔══════════════════════════════════╗
║  ${PE.money} <b>DEPOSIT REVIEW</b> ${PE.money}  ║
╚══════════════════════════════════╝

${PE.user} <b>Username:</b> <code>${escapeHtml(user.username)}</code>
${PE.card} <b>Email:</b> <code>${escapeHtml(user.email)}</code>
${PE.money} <b>Amount Requested:</b> <b>₹${request.coins_requested}</b>
${PE.gift} <b>Amount:</b> <b>₹${request.amount_paid}</b>
${request.payment_method && request.payment_method !== 'upi' ? `<b>Reported USDT ${escapeHtml(request.payment_method.toUpperCase())}:</b> ${escapeHtml(request.payment_amount)} USDT\n<b>Receiving address:</b> <code>${escapeHtml(request.payment_address)}</code>\n<b>Rate:</b> ₹${request.payment_rate}/USDT · Bonus ₹${request.payment_bonus}\n` : ''}${PE.verified} <b>UTR / TXID:</b> <code>${escapeHtml(request.utr)}</code>
${request.payment_note ? `<b>Note:</b> ${escapeHtml(String(request.payment_note).slice(0,100))}\n` : ''}${PE.dot} <b>Request ID:</b> <code>#${request.id}</code>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Verify payment and choose action below:</i>`;

  const rows = [[
    { text: toSansBoldItalic('Approve payment'), emoji: '✅', icon: PE_ID.check, callback_data: `approve_${request.id}`, style: 'success' },
    { text: toSansBoldItalic('Reject'), emoji: '❌', icon: PE_ID.alert, callback_data: `reject_${request.id}`, style: 'danger' }
  ]];

  try {
    const sent = await sendWithFallback((reply_markup) => {
      if (screenshotPath && fs.existsSync(screenshotPath)) {
        return bot.sendPhoto(adminChatId, fs.createReadStream(screenshotPath), {
          caption: msg, parse_mode: 'HTML', reply_markup
        });
      }
      return bot.sendMessage(adminChatId, msg, { parse_mode: 'HTML', reply_markup });
    }, rows);
    return sent.message_id;
  } catch (e) {
    console.error('Telegram sendCoinRequest error:', e.message);
    return null;
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(error, attempt) {
  const body = error?.response?.body;
  let parsedBody = body;
  if (typeof body === 'string') {
    try { parsedBody = JSON.parse(body); } catch (_) {}
  }

  const retryAfter = Number(parsedBody?.parameters?.retry_after || 0);
  if (retryAfter > 0) return retryAfter * 1000;

  const status = Number(error?.response?.statusCode || 0);
  const code = error?.code || error?.cause?.code;
  const retryableCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'EPIPE']);
  if (status === 429 || status >= 500 || retryableCodes.has(code)) {
    return Math.min(2_000 * (attempt + 1), 10_000);
  }
  return null;
}

async function sendDocumentWithRetry(sender, telegramId, apkPath, caption) {
  const filename = path.basename(apkPath);
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await sender.sendDocument(
        telegramId,
        apkPath,
        { caption, parse_mode: 'HTML' },
        { filename, contentType: 'application/vnd.android.package-archive' }
      );
    } catch (error) {
      const delay = getRetryDelay(error, attempt);
      if (attempt === maxAttempts - 1 || delay === null) throw error;
      await wait(delay);
    }
  }
}

// ── Ultra-Sleek APK Delivery with Premium Emojis ──
async function deliverApkReady(sender, user, order, apkPaths, downloadUrls) {
  presentation.install(sender);
  const telegramId = user.telegram_id;
  const validApkPaths = apkPaths.filter(apkPath => apkPath && fs.existsSync(apkPath));
  const appNamePlain = order.app_name || 'APK';
  const siteUrl = getSiteUrl();
  const supportUrl = getSupportUrl();
  let statusMessage = null;
  let sentCount = 0;
  const failedFiles = [];

  if (validApkPaths.length > 0) {
    const headerCard = `${PE.check} <b>${escapeHtml(appNamePlain)} · Build ready</b>\n${PE.down} Sending your APK files…`;

    try {
      statusMessage = await sender.sendMessage(
        telegramId,
        headerCard,
        { parse_mode: 'HTML', disable_web_page_preview: true }
      );
    } catch (error) {
      console.error('Bot APK status message error:', error.message);
    }

    for (let index = 0; index < validApkPaths.length; index++) {
      const apkPath = validApkPaths[index];
      const filename = path.basename(apkPath);
      const isReal = index === 0 && order.design_variant !== 'fake' && !order.is_fake;
      const caption = `${isReal ? PE.check : PE.sparkles} <b>${isReal ? 'Real APK' : 'Fake APK'}</b>\n<code>${escapeHtml(filename)}</code>\n<i>ZAYRO BUILD · Download ready</i>`;

      try {
        await sendDocumentWithRetry(sender, telegramId, apkPath, caption);
        sentCount++;
      } catch (error) {
        failedFiles.push(filename);
        console.error(`Bot sendDocument error (${filename}):`, error.message);
      }
    }

    let completionCard = failedFiles.length === 0
      ? `${PE.check} <b>${escapeHtml(appNamePlain)} · Ready</b>\n${sentCount} APK file(s) delivered. Files are attached above.`
      : `${PE.alert} <b>${sentCount}/${validApkPaths.length} APK file(s) sent.</b>\nPlease open My Orders to download remaining files.`;

    let deliveryButtons = [
      [
        { text: toSansBoldItalic('Build Another APK'), emoji: '🛠️', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' }
      ],
      [
        { text: toSansBoldItalic('My Orders'), emoji: '📱', icon: PE_ID.mobile, web_app: { url: panelLink(siteUrl,'orders') }, style: 'primary' },
        { text: toSansBoldItalic('Support'), emoji: '👨‍💻', icon: PE_ID.phone, url: supportUrl, style: 'primary' }
      ]
    ];
    const originalCard=completionCard,originalButtons=deliveryButtons;
    const customized=require('./bot-message-editor').apply(_db,'apk-ready',completionCard,deliveryButtons,siteUrl);completionCard=customized.html;deliveryButtons=customized.rows;
    const sendDelivery = async(fn) => {try{return await sendWithFallback(fn,deliveryButtons);}catch(e){if(e.response?.body?.error_code!==400)throw e;completionCard=originalCard;deliveryButtons=originalButtons;return sendWithFallback(fn,deliveryButtons);}};

    if (statusMessage?.message_id) {
      try {
        await sendDelivery((reply_markup) => sender.editMessageText(
          completionCard,
          {
            chat_id: telegramId,
            message_id: statusMessage.message_id,
            parse_mode: 'HTML',
            reply_markup
          }
        ));
      } catch (_) {}
    } else {
      try {
        await sendDelivery((reply_markup) => sender.sendMessage(telegramId, completionCard, {
          parse_mode: 'HTML',
          reply_markup
        }));
      } catch (_) {}
    }
  }
}

function sendApkReady(user, order, apkPaths = [], downloadUrls = []) {
  const sender = deliveryBot;
  if (!sender || !user?.telegram_id) return Promise.resolve();

  const delivery = apkDeliveryQueue.then(() => deliverApkReady(
    sender,
    { ...user },
    { ...order },
    Array.isArray(apkPaths) ? [...apkPaths] : [],
    Array.isArray(downloadUrls) ? [...downloadUrls] : []
  ));

  apkDeliveryQueue = delivery.catch(error => {
    console.error('Bot APK delivery error:', error.message);
  });
  return delivery;
}

/**
 * Ek user ko simple HTML notice bhejo (deploy-bot status, admin actions etc.).
 * Bot offline ho to silently skip — caller ka flow nahi rukta.
 */
async function sendUserNotice(chatId, html, replyMarkup = null) {
  if (!bot || !chatId) return null;
  try {
    const rows=replyMarkup?.inline_keyboard||[[{text:'Open panel',emoji:'✨',style:'primary',web_app:{url:getSiteUrl()}}]];
    return await sendPremium(chatId,html,rows,{templateKey:replyMarkup?.templateKey});

  } catch (error) {
    console.error('[Telegram] user notice failed:', error.message);
    return null;
  }
}

// ── Broadcast Announcement to All Telegram Bot Users with Premium Emojis ──
async function broadcastAnnouncement(announcement) {
  if (!bot || !_db) throw new Error('Telegram bot is not configured or running');

  const users = _db.prepare("SELECT DISTINCT telegram_id FROM users WHERE telegram_id IS NOT NULL AND telegram_id != ''").all();
  if (!users.length) return { total: 0, sent: 0, failed: 0 };

  const { title, message, image_url, button_text, button_url } = announcement;
  const siteUrl = getSiteUrl();
  const supportUrl = getSupportUrl();

  const text =
`╔══════════════════════════════════╗
║  ${PE.broadcast} <b>${escapeHtml(title.toUpperCase())}</b> ${PE.bell}  ║
╚══════════════════════════════════╝

${escapeHtml(message)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.sparkles} <i>Updates, offers & new releases · Choose an action below</i>`;

  const inlineKeyboard = [];
  if (button_text && button_url) {
    inlineKeyboard.push([{
      text: toSansBoldItalic(button_text),
      emoji: '🔗',
      icon: PE_ID.sparkles,
      url: button_url.startsWith('http') ? button_url : `https://${button_url}`,
      style: 'success'
    }]);
  }
  inlineKeyboard.push([
    { text: toSansBoldItalic('Open Builder'), emoji: '🚀', icon: PE_ID.rocket, web_app: { url: siteUrl }, style: 'success' },
    { text: toSansBoldItalic('Support'), emoji: '👨‍💻', icon: PE_ID.phone, url: supportUrl, style: 'primary' }
  ]);

  const customized=require('./bot-message-editor').apply(_db,'announcement',text,inlineKeyboard,siteUrl);
  const broadcastRows = customized.rows;

  let sent = 0;
  let failed = 0;

  for (const u of users) {
    try {
      await sendWithFallback((reply_markup) => {
        if (image_url && image_url.startsWith('http')) {
          return bot.sendPhoto(u.telegram_id, image_url, {
            caption: customized.html,
            parse_mode: 'HTML',
            reply_markup
          });
        }
        return bot.sendMessage(u.telegram_id, customized.html, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup
        });
      }, broadcastRows);
      sent++;
      await wait(40);
    } catch (e) {
      failed++;
    }
  }

  return { total: users.length, sent, failed };
}

// ── Log Channel & Group Activity Logger with Premium Emojis ──
async function sendLogEvent(eventType, data = {}, attachments = []) {
  if (!bot || !_db) return;
  try {
    const isLogEnabled = _db.prepare("SELECT value FROM settings WHERE key='telegram_log_enabled'").get()?.value;
    if (isLogEnabled === '0' || isLogEnabled === 'false') return;

    const logChannelId = _db.prepare("SELECT value FROM settings WHERE key='telegram_log_channel_id'").get()?.value;
    if (!logChannelId || !logChannelId.trim()) return;

    const targetChat = logChannelId.trim();
    let text = '';

    if (eventType === 'user_registered') {
      text =
`╔══════════════════════════════════╗
║  ${PE.user} <b>𝐍𝐄𝐖 𝐔𝐒𝐄𝐑 𝐑𝐄𝐆𝐈𝐒𝐓𝐑𝐀𝐓𝐈𝐎𝐍</b> ${PE.party}  ║
╚══════════════════════════════════╝

${PE.user} <b>Username:</b> <code>${escapeHtml(data.username)}</code>
${PE.card} <b>Email:</b> <code>${escapeHtml(data.email)}</code>
${PE.money} <b>Starting Balance:</b> <code>₹${data.coins || 0}</code>
${PE.dot} <b>User ID:</b> <code>#${data.id}</code>
${PE.broadcast} <b>IP Address:</b> <code>${escapeHtml(data.ip || 'Unknown')}</code>
${PE.card} <b>Timestamp:</b> <code>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</code>`;
      await sendPremium(targetChat,text,[[{text:'Open admin panel',emoji:'🛡️',icon:PE_ID.gear,style:'primary',url:`${getSiteUrl()}/admin`}]],{templateKey:'admin-log'});
    } else if (eventType === 'order_created') {
      const modeLabel = data.build_mode === 'fake' ? `${PE.sparkles} Fake / Clone APK Only` : data.build_mode === 'both' ? `${PE.fire} Real + Fake Both APKs` : `${PE.crown} Real Production APK`;
      text =
`╔══════════════════════════════════╗
║  ${PE.rocket} <b>𝐍𝐄𝐖 𝐀𝐏𝐊 𝐁𝐔𝐈𝐋𝐃 𝐒𝐓𝐀𝐑𝐓𝐄𝐃</b> ${PE.fire}  ║
╚══════════════════════════════════╝

${PE.user} <b>User:</b> <code>${escapeHtml(data.username)}</code> (ID: <code>#${data.user_id}</code>)
${PE.crown} <b>App Name:</b> <code>${escapeHtml(data.app_name)}</code>
${PE.card} <b>Package:</b> <code>${escapeHtml(data.package_name)}</code>
${PE.sparkles} <b>Template:</b> <b>${escapeHtml(data.design_name || 'Universal')}</b>
${PE.gear} <b>Build Mode:</b> <b>${modeLabel}</b>
${PE.money} <b>Cost:</b> <b>₹${data.coins_spent}</b>${data.coupon_code ? ` (${PE.gift} Coupon: <code>${escapeHtml(data.coupon_code)}</code> -${data.discount_coins})` : ''}
${PE.arrow} <b>Link:</b> <code>${escapeHtml(data.register_url || data.fake_register_url || '')}</code>
${PE.dot} <b>Order ID:</b> <code>#${data.id}</code>
${PE.card} <b>Timestamp:</b> <code>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</code>`;
      await sendPremium(targetChat,text,[[{text:'Open admin panel',emoji:'🛡️',icon:PE_ID.gear,style:'primary',url:`${getSiteUrl()}/admin`}]],{templateKey:'admin-log'});
    } else if (eventType === 'order_completed') {
      text =
`╔══════════════════════════════════╗
║  ${PE.trophy} <b>𝐀𝐏𝐊 𝐁𝐔𝐈𝐋𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋!</b> ${PE.trophy}  ║
╚══════════════════════════════════╝

${PE.user} <b>User:</b> <code>${escapeHtml(data.username)}</code> (#${data.user_id})
${PE.crown} <b>App:</b> <code>${escapeHtml(data.app_name)}</code> (Order: <code>#${data.order_id}</code>)
${PE.lock} <b>Security:</b> <b>100% Antivirus Clean • Dex Protect X Hardened</b>
${PE.check} <b>Status:</b> <b>Compiled & Archived</b> ${PE.check}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${PE.down} <i>APK file(s) attached below for archive.</i>`;
      await sendPremium(targetChat,text,[[{text:'Open admin panel',emoji:'🛡️',icon:PE_ID.gear,style:'primary',url:`${getSiteUrl()}/admin`}]],{templateKey:'admin-log'});

      if (Array.isArray(attachments) && attachments.length > 0) {
        for (const apkPath of attachments) {
          if (apkPath && fs.existsSync(apkPath)) {
            const filename = path.basename(apkPath);
            await bot.sendDocument(targetChat, apkPath, {
              caption: `${PE.mobile} <b>Archive:</b> <code>${escapeHtml(filename)}</code>\nOrder: #${data.order_id} | User: ${escapeHtml(data.username)}`,
              parse_mode: 'HTML'
            }, { filename, contentType: 'application/vnd.android.package-archive' });
            await wait(200);
          }
        }
      }
    } else if (eventType === 'coin_requested') {
      text =
`╔══════════════════════════════════╗
║  ${PE.money} <b>𝐍𝐄𝐖 𝐂𝐎𝐈𝐍 𝐃𝐄𝐏𝐎𝐒𝐈𝐓</b> ${PE.money}  ║
╚══════════════════════════════════╝

${PE.user} <b>User:</b> <code>${escapeHtml(data.username)}</code> (ID: <code>#${data.user_id}</code>)
${PE.money} <b>Amount Requested:</b> <b>+₹${data.coins_requested}</b>
${PE.gift} <b>Amount Paid:</b> <b>₹${data.amount_paid}</b>
${PE.verified} <b>UTR:</b> <code>${escapeHtml(data.utr)}</code>
${PE.dot} <b>Request ID:</b> <code>#${data.id}</code>`;
      if (data.screenshot_path && fs.existsSync(data.screenshot_path)) {
        await bot.sendPhoto(targetChat, fs.createReadStream(data.screenshot_path), {
          caption: text,
          parse_mode: 'HTML'
        });
      } else {
        await bot.sendMessage(targetChat, text, { parse_mode: 'HTML' });
      }
    } else if (eventType === 'gift_claimed') {
      text =
`╔══════════════════════════════════╗
║  ${PE.gift} <b>𝐆𝐈𝐅𝐓 𝐂𝐎𝐃𝐄 𝐂𝐋𝐀𝐈𝐌𝐄𝐃</b> ${PE.sparkles}  ║
╚══════════════════════════════════╝

${PE.user} <b>User ID:</b> <code>#${data.user_id}</code>
${PE.card} <b>Code:</b> <code>${escapeHtml(data.code)}</code>
${PE.money} <b>Amount Added:</b> <b>+₹${data.coins}</b>
${PE.diamond} <b>New Balance:</b> <code>₹${data.balance || 0}</code>
${PE.card} <b>Timestamp:</b> <code>${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</code>`;
      await sendPremium(targetChat,text,[[{text:'Open admin panel',emoji:'🛡️',icon:PE_ID.gear,style:'primary',url:`${getSiteUrl()}/admin`}]],{templateKey:'admin-log'});
    } else if (eventType === 'deploy_requested') {
      text =
`╔══════════════════════════════════╗
║  ${PE.bot} <b>𝐍𝐄𝐖 𝐃𝐄𝐏𝐋𝐎𝐘 𝐑𝐄𝐐𝐔𝐄𝐒𝐓</b> ${PE.rocket}  ║
╚══════════════════════════════════╝

${PE.user} <b>User:</b> <code>${escapeHtml(data.username)}</code> (ID: <code>#${data.user_id}</code>)
${PE.crown} <b>Bot Name:</b> <code>${escapeHtml(data.bot_name)}</code>
${PE.star} <b>Plan:</b> <b>${escapeHtml(data.plan)}</b> · ₹${data.price}
${PE.dot} <b>Request ID:</b> <code>#${data.id}</code>`;
      await sendPremium(targetChat,text,[[{text:'Open admin panel',emoji:'🛡️',icon:PE_ID.gear,style:'primary',url:`${getSiteUrl()}/admin`}]],{templateKey:'admin-log'});
    }
  } catch (err) {
    console.error('Telegram sendLogEvent error:', err.message);
  }
}

// Dedicated automated stock notices preserve delivery errors for queue policy.
async function sendStockAlert(chatId,html,rows){
 if(!bot){const error=new Error('Bot unavailable');error.code='BOT_NOT_READY';throw error;}
 return sendPremium(chatId,html,rows,{templateKey:false});
}

module.exports = {
  setWebsiteStore: store => { websiteStore = store; },
  getSiteUrl, sendStockAlert, initBot, sendCoinRequest, sendApkReady, broadcastAnnouncement, sendLogEvent, sendUserNotice,
  // Tests ke liye pure helpers (bot network ke bina verify ho sake)
  __test: { buildMenuButton, sendWithFallback, deliverApkReady, buildStartMessage, buildStartButtons, premiumButtonRows, toSansBoldItalic, boldNum, PE, PE_ID }
};
