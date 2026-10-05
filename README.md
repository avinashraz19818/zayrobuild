# ZAYRO BUILD — Premium APK Marketplace (Panel v3)

Telegram Mini App panel + Express server. Users Telegram bot se login karte hain,
templates se signed APK banate hain, fake website / deploy-bot / gift codes sab isi panel me hain.

```
server.js              → Express server (API + static panel + admin routes)
frontend/              → React (Vite) panel source  →  build hota hai public/ me
database/db.js         → SQLite schema + migrations (better-sqlite3)
utils/telegram.js      → Telegram bot (premium emoji messages, logs, broadcasts)
public/                → live panel (index.html + assets) jo server serve karta hai
uploads/, templates/   → design media + popup HTML files (DB me reference hote hain)
```

---

## VPS par start karne ka tarika (Ubuntu / Debian)

```bash
# 1) Node 20+ chahiye
node -v                      # v20 ya usse upar
# agar nahi hai:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs

# 2) zaroori build tools (better-sqlite3 native module ke liye)
sudo apt install -y build-essential python3

# 3) repo clone (shallow clone jaldi ho jaata hai)
git clone --depth 1 -b arena/e31c7d08-zayrobuild https://github.com/avinashraz19818/zayrobuild.git
cd zayrobuild

# 4) dependencies
npm install
npm --prefix frontend install      # (sirf UI rebuild ke liye; chalta panel already public/ me hai)

# 5) bas start (`.env` aur `firebase-service-account.json` clone ke saath hi aa jaate hain)
npm start
# → "APK Builder running on port 3000"
```

Kuch values badalni ho to `.env` edit karke server restart kar dein:
admin password ke liye `node scripts/set-admin-password.js "NayaPassword"`
(uska hash `.env` ke `ADMIN_PASSWORD_HASH` me daalein).

Panel: `http://<VPS-IP>:3000` · Admin: `http://<VPS-IP>:3000/admin` (Admin tab se unlock)

### Agar native module error aaye

| Error | Fix |
|---|---|
| `better-sqlite3 invalid ELF header` ya `NODE_MODULE_VERSION` | `npm rebuild better-sqlite3` |
| `Cannot find module 'sharp'` / sharp load error | `npm install --include=optional sharp` |
| node-gyp headers download fail | `npm rebuild better-sqlite3 --nodedir=/usr/local` (ya Node headers install karein) |
| `Error: listen EADDRINUSE :::3000` | Port pehle se busy hai. `ss -ltnp \| grep ':3000'` se dekhein, phir `PORT=3001 npm start` karein (ya `.env` me `PORT=3001`) |
| pm2 me port change nahi hua | `.env` edit karne ke baad `pm2 restart zayro-panel && pm2 save` |
| `[fb-token] exchange failed with status 400` | Firebase service-account key invalid/disable ho gayi hai. `node scripts/diag-firebase-auth.js` chalayein aur Google Cloud Console se **nayi key** banakar `firebase-service-account.json` replace karein |

### Chalu rakhne ke liye (optional)

```bash
sudo npm i -g pm2
pm2 start server.js --name zayro-panel
pm2 save && pm2 startup
```

---

## Settings / keys

`.env` aur `firebase-service-account.json` repo me hain (aapki request par), taaki
clone ke saath hi saari settings aa jaayein. Keys: PORT, SITE_NAME, SESSION_SECRET,
TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, FIREBASE_*, ADMIN_USERNAME,
ADMIN_PASSWORD_HASH, KEYSTORE_*. Reference ke liye `.env.example` bhi rakha hai.

⚠️ **Ye asli secrets hain aur repo public hai.** Jo bhi ise dekh sakta hai, wo aapka
bot token / admin hash / Firebase key use kar sakta hai. Isliye:
- Telegram bot token BotFather → `/revoke` se naya lein
- `SESSION_SECRET` naya random string rakhein
- Admin password change karein (`node scripts/set-admin-password.js`)
- Firebase service account key Google Cloud console se delete karke nayi banayein
- Ya repo ko **private** kar dein (GitHub → Settings → Danger Zone → Change visibility)

Isi tarah `.gitignore` me `database/apkbuilder.db` ki lines jaan-boojh kar hata di gayi hain —
DB me aapke templates, designs, settings aur users hain, aur wahi data clone ke saath aana chahiye.
(Agar aapko fresh DB chahiye to file delete karke server restart karein.)

Panel me sabse zaroori settings (Admin → Settings se):
- **Store name + Brand logo** (logo header aur loading screen par dikhta hai)
- **UPI ID / QR** (wallet deposit ke liye)
- **Support username / channel URL / admin Telegram ID**
- **Deploy Bot plans** + service ON/OFF
- Telegram bot token / log channel purane legacy dashboard se manage hote hain

## Telegram bot (mini app) setup

1. `TELEGRAM_BOT_TOKEN` `.env` me daalein.
2. BotFather me bot ko **Mini App** ke tor par panel URL ke saath set karein.
3. User jab bot me `/start` karega → account apne aap ban jaata hai
   (Telegram profile hi account hai — koi signup/login nahi).
4. Panel ko Telegram ke andar se hi kholein; bahar se khulne par "Open in Telegram" gate dikhta hai.

## Frontend rebuild (UI change karne ke baad)

```bash
npm --prefix frontend install
npm --prefix frontend run build      # output seedha ../public me jaata hai
```

Smoke test (headless DOM check, mock data):

```bash
cd frontend
npx vite build --ssr smoke/entry.jsx --outDir smoke/dist && node smoke/run.mjs
```

## Features (panel v3)

- **Home storefront** — store banner, announcement, hero, balance, services, quick actions,
  how-it-works, templates (Latest/Popular/High/Low), why-choose-us, refer promo, support
- **Templates** — premium tiles + `Create APK` button (category naam card par nahi dikhta)
- **Build wizard** — app name (= brand title), font style, icon upload, mode (real/fake/both), register links
- **Wallet** — UPI deposit + screenshot, deposit history
- **Gift Codes** — admin code banata hai, user profile → Gift Code se claim karta hai (coins turant add)
- **Deploy Bot** — user request bhejta hai, admin live/reject karta hai (status Telegram par bhi)
- **Fake Website** (UI + request flow tayar; APK engine aapke bataye steps par banega)
- **Deploy Bot** (plans, request → admin approve/reject flow ready; actual bot deploy engine baad me)
- **Refer & Earn** — invite link/code, bonus coins, invited list (live tested)
- **Orders + build logs + dynamic links**
- **Admin panel** — Overview · Templates · Deposits · Orders · Users · Deploy Bot · Announce · Gift Codes · Settings
