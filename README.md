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

# 3) repo clone
git clone https://github.com/avinashraz19818/zayrobuild.git
cd zayrobuild
git checkout arena/e31c7d08-zayrobuild     # (agar main me merge nahi hua ho)

# 4) dependencies
npm install

# 5) start
npm start
# → "APK Builder running on port 3000"
```

Panel: `http://<VPS-IP>:3000` · Admin: `http://<VPS-IP>:3000/admin` (Admin tab se unlock)

### Agar native module error aaye

| Error | Fix |
|---|---|
| `better-sqlite3 invalid ELF header` ya `NODE_MODULE_VERSION` | `npm rebuild better-sqlite3` |
| `Cannot find module 'sharp'` / sharp load error | `npm install --include=optional sharp` |
| node-gyp headers download fail | `npm rebuild better-sqlite3 --nodedir=/usr/local` (ya Node headers install karein) |

### Chalu rakhne ke liye (optional)

```bash
sudo npm i -g pm2
pm2 start server.js --name zayro-panel
pm2 save && pm2 startup
```

---

## Settings / keys

`.env` repo me hai (PORT, SITE_NAME, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID,
FIREBASE_*, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, KEYSTORE_*).
⚠️ Isme secrets hain — GitHub repo private rakhein, warna token leak ho jaayega.

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
- **Fake Website**, **Refer & Earn**, **Orders + build logs + dynamic links**
- **Admin panel** — Overview · Templates · Deposits · Orders · Users · Deploy Bot · Announce · Gift Codes · Settings
