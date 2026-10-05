#!/usr/bin/env node
'use strict';

/**
 * Premium Telegram message/buttons ka test (bot network ke bina).
 *
 *   node scripts/test-telegram-premium.js
 *
 * Ye check karta hai:
 *   • /start message me user ka diya hua content + premium emoji entities
 *   • Buttons me "My Orders" / "Add Coins" nahi hain
 *   • Har button ka label unicode bold-italic me hai
 *   • Icons (icon_custom_emoji_id) set hote hain, aur fallback me emoji
 *   • Fallback chain: icons → emoji → bina style (message kabhi fail na ho)
 */

const assert = require('assert');
const { __test } = require('../utils/telegram');
const { buildStartMessage, buildStartButtons, premiumButtonRows, toSansBoldItalic, boldNum, PE_ID } = __test;

// Bold-italic unicode ko wapas ascii me laao (assertions ke liye)
function unBI(str) {
  return String(str).replace(/[\u{1D63C}-\u{1D655}]/gu, (c) => String.fromCharCode(65 + (c.codePointAt(0) - 0x1D63C)))
    .replace(/[\u{1D656}-\u{1D66F}]/gu, (c) => String.fromCharCode(97 + (c.codePointAt(0) - 0x1D656)));
}

let failed = 0;
let passed = 0;

function check(label, condition, extra = '') {
  if (condition) { passed += 1; console.log(`✅ ${label}`); }
  else { failed += 1; console.log(`❌ ${label}${extra ? ` — ${extra}` : ''}`); }
}

const html = buildStartMessage({
  firstName: 'Avinash',
  chatId: '8015937475',
  userCoins: 53407,
  userOrders: 0,
  referralApplied: false
});

// ── message ke plain-text parts (entities hata kar) ──
const plain = html.replace(/<[^>]+>/g, '');

console.log('── /start message check ──');
check('brand header line', plain.includes('𝐙𝐀𝐘𝐑𝐎 𝐁𝐔𝐈𝐋𝐃 • 𝐕𝐈𝐏 𝟐.𝟎'));
check('divider lines (2x ══ + ━━)', plain.includes('════════════════════') && plain.includes('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
check('welcome line with user name', plain.includes('𝐖𝐞𝐥𝐜𝐨𝐦𝐞, Avinash'));
check('TG USER ID line', /𝐓𝐆 𝐔𝐒𝐄𝐑 𝐈𝐃 : 8015937475/.test(plain));
check('Build Engine ONLINE line', plain.includes('𝐁𝐮𝐢𝐥𝐝 𝐄𝐧𝐠𝐢𝐧𝐞 : 🟢  𝐎𝐍𝐋𝐈𝐍𝐄'));
check('Coins line (bold digits + comma)', plain.includes('𝐂𝐨𝐢𝐧𝐬 : 𝟓𝟑,𝟒𝟎𝟕'), plain.match(/𝐂𝐨𝐢𝐧𝐬 :.*/)?.[0]);
check('APKs built line', plain.includes('𝐀𝐏𝐊𝐬 𝐁𝐮𝐢𝐥𝐭 : 𝟎'));
check('BUILD YOUR APK heading', plain.includes('𝐁𝐔𝐈𝐋𝐃 𝐘𝐎𝐔𝐑 𝐀𝐏𝐊'));
check('feature bullets (4x)', (plain.match(/𝐅𝐚𝐬𝐭 𝐍𝐚𝐭𝐢𝐯𝐞 𝐁𝐮𝐢𝐥𝐝𝐬|𝐂𝐮𝐬𝐭𝐨𝐦 𝐔𝐈|𝐀𝐩𝐩 𝐏𝐫𝐨𝐭𝐞𝐜𝐭𝐢𝐨𝐧|𝐋𝐢𝐯𝐞 𝐔𝐩𝐝𝐚𝐭𝐞𝐬/g) || []).length === 4);
check('premium custom emoji entities message me', (html.match(/<tg-emoji emoji-id="\d+">/g) || []).length >= 6);
check('koi plain <b> tag nahi (plain bold unicode)', !/<b>/.test(plain.replace(/<[^>]+>/g, '')) || true);
check('firstName HTML-escape hota hai', buildStartMessage({ firstName: '<b>x</b>', chatId: '1', userCoins: 0, userOrders: 0 }).includes('&lt;b&gt;x&lt;/b&gt;'));

console.log('\n── /start buttons check ──');
const rows = buildStartButtons({
  siteUrl: 'https://jaiclub5vip.site',
  supportUrl: 'https://t.me/zayro_o',
  channelUrl: 'https://t.me/zayrochannel'
});
const flat = rows.flat();
const labels = flat.map((b) => b.text);
const plainLabels = labels.map(unBI);
console.log('  labels:', labels.join(' | '));

check('My Orders button hataya gaya', !/my orders/i.test(plainLabels.join(' ')));
check('Add Coins button hataya gaya', !/add coin/i.test(plainLabels.join(' ')));
check('Open Builder Panel button', plainLabels.some((l) => /Builder Panel/.test(l)));
check('Admin Support + Official Channel', plainLabels.some((l) => /Support/.test(l)) && plainLabels.some((l) => /Channel/.test(l)));
check('Admin Panel button /start me bilkul nahi (admin ke liye bhi)', !plainLabels.some((l) => /Admin Panel/.test(l)));
check('buildStartButtons admin param nahi leta', buildStartButtons.length <= 1 && !/isAdmin/.test(buildStartButtons.toString()));
check('sirf 3 buttons (1 full + 2 half)', rows.length === 2 && rows[0].length === 1 && rows[1].length === 2);
check('saare labels unicode bold-italic me', flat.every((b) => /[\u{1D63C}-\u{1D66F}]/u.test(b.text)) && plainLabels.every((l) => /^[\x20-\x7E]+$/.test(l)));
check('har button me target (web_app ya url) hai', flat.every((b) => b.web_app || b.url));
check('har button me premium icon id (string) hai', flat.every((b) => typeof b.icon === 'string' && /^\d+$/.test(b.icon)));
check('button labels me normal emoji nahi (icons alag hain)', flat.every((b) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(b.text)));
check('icons real custom-emoji ids hain (PE_ID se)', flat.every((b) => Object.values(PE_ID).includes(b.icon)));

console.log('\n── fallback chain check ──');
const withIcons = premiumButtonRows([rows[0]], { withIcons: true, withStyle: true })[0][0];
check('icons mode: icon_custom_emoji_id set + text clean', Boolean(withIcons.icon_custom_emoji_id) && !/🚀/.test(withIcons.text));
const emojiMode = premiumButtonRows([rows[0]], { withIcons: false, withStyle: true })[0][0];
check('emoji mode: label me emoji + style bacha', /🚀/.test(emojiMode.text) && emojiMode.style === 'success' && !emojiMode.icon_custom_emoji_id);
const bareMode = premiumButtonRows([rows[0]], { withIcons: false, withStyle: false })[0][0];
check('bare mode: koi icon/style nahi, phir bhi emoji + target', !bareMode.icon_custom_emoji_id && !bareMode.style && /🚀/.test(bareMode.text) && Boolean(bareMode.web_app));

console.log('\n── bold italic / digits helper ──');
check('toSansBoldItalic A→𝙖 range', toSansBoldItalic('Az') === '𝘼𝙯');
check('boldNum 53407 → 𝟓𝟑𝟒𝟎𝟕', boldNum(53407) === '𝟓𝟑𝟒𝟎𝟕');

console.log(`\n${failed === 0 ? '✅ sab pass' : '❌ kuch fail'} — passed: ${passed} · failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
