#!/usr/bin/env node
'use strict';

/**
 * Bot ka /start message + buttons ek HTML preview me render karta hai
 * (Telegram jaisa dark bubble). Bot network ke bina — sirf builders call hote hain.
 *
 *   node scripts/bot-message-preview.js            # default sample
 *   node scripts/bot-message-preview.js 12500 7    # coins aur APKs badal kar
 *
 * Output: frontend/smoke/out/mobile/bot-preview.html
 */

const fs = require('fs');
const path = require('path');
const { __test } = require('../utils/telegram');
const { buildStartMessage, buildStartButtons } = __test;

const coins = Number(process.argv[2] || 52500);
const apks = Number(process.argv[3] || 0);
const firstName = process.argv[4] || 'TM ⚡ ZAYRO';

const msg = buildStartMessage({
  firstName,
  chatId: '8015937475',
  userCoins: coins,
  userOrders: apks,
  referralApplied: false
});

const rows = buildStartButtons({
  siteUrl: 'https://jaiclub5vip.site',
  supportUrl: 'https://t.me/zayro_o',
  channelUrl: 'https://t.me/zayrochannel'
});

// Bold-italic unicode → plain ascii (preview me normal font dikhega)
const unBI = (str) => String(str)
  .replace(/[\u{1D63C}-\u{1D655}]/gu, (c) => String.fromCharCode(65 + (c.codePointAt(0) - 0x1D63C)))
  .replace(/[\u{1D656}-\u{1D66F}]/gu, (c) => String.fromCharCode(97 + (c.codePointAt(0) - 0x1D656)));

const bubble = msg
  .replace(/<tg-emoji emoji-id="\d+">([^<]+)<\/tg-emoji>/g, '<span class="pemoji">$1</span>')
  .replace(/<code>([^<]*)<\/code>/g, '<span class="mono">$1</span>');

const cls = (style) => (style === 'success' ? 'ok' : style === 'danger' ? 'danger' : 'primary');
const buttons = rows.map((row) => `<div class="btns">${row.map((b) => {
  const label = unBI(b.text);
  return `<button class="tbtn ${cls(b.style)}"><span class="cico">${b.emoji || '•'}</span><span>${label}</span></button>`;
}).join('')}</div>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bot message preview · ZAYRO BUILD</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:22px; background:#0e1621; color:#e9eaf6;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .phone { max-width:430px; margin:0 auto; }
  .bubble { background:linear-gradient(160deg,#1c2b3a,#17212b); border-radius:16px;
            padding:14px 16px; box-shadow:0 12px 30px -18px #000; line-height:1.55; font-size:13.5px;
            white-space:pre-wrap; word-break:break-word; }
  .pemoji { filter: drop-shadow(0 0 6px rgba(139,124,255,.5)); }
  .mono { font-family:ui-monospace,Consolas,monospace; color:#8fd3ff; font-size:12.5px; }
  .btns { display:flex; gap:8px; margin-top:8px; }
  .tbtn { flex:1; display:flex; align-items:center; justify-content:center; gap:7px;
          padding:11px 10px; border:0; border-radius:11px; color:#fff; font-size:13px;
          font-family:inherit; font-weight:600; cursor:pointer; }
  .tbtn.primary { background:#2f6ee0; }
  .tbtn.ok { background:#1f9d61; }
  .tbtn.danger { background:#c4453f; }
  .cico { font-size:15px; }
  .hint { text-align:center; color:#7d8b9c; font-size:11.5px; margin:16px 0 4px; line-height:1.6; }
</style></head>
<body>
  <div class="phone">
    <div class="bubble">${bubble}</div>
    ${buttons}
    <div class="hint">
      Telegram me icons premium (animated) custom emoji hote hain — bot premium na hone par
      wahi emoji text ke saath lag jaate hain.<br>
      Admin Panel button jaan-boojh kar nahi hai (admin ke liye bot me <b>/admin</b> command hai).
    </div>
  </div>
</body></html>`;

const outDir = path.join(__dirname, '..', 'frontend', 'smoke', 'out', 'mobile');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'bot-preview.html');
fs.writeFileSync(outFile, html);
console.log(`✅ preview → ${path.relative(process.cwd(), outFile)}`);
console.log(`   coins=${coins} · apks=${apks} · buttons=${rows.flat().length}`);
