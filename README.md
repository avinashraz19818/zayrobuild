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

`.env` git me tracked nahi hai (server par ise edit karte hain, isliye har `git pull` par
conflict deti thi). Repo me **`.env.example`** hai jisme poori working settings hain —
pehli baar server chalne par `.env` khud isse ban jaati hai. Keys: PORT, SITE_NAME, SESSION_SECRET,
TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, FIREBASE_*, ADMIN_USERNAME,
ADMIN_PASSWORD_HASH, KEYSTORE_*. Reference ke liye `.env.example` bhi rakha hai.

⚠️ **Ye asli secrets hain aur repo public hai.** Jo bhi ise dekh sakta hai, wo aapka
bot token / admin hash / Firebase key use kar sakta hai. Isliye:
- Telegram bot token BotFather → `/revoke` se naya lein
- `SESSION_SECRET` naya random string rakhein
- Admin password change karein (`node scripts/set-admin-password.js`)
- Firebase service account key Google Cloud console se delete karke nayi banayein
- Ya repo ko **private** kar dein (GitHub → Settings → Danger Zone → Change visibility)

### Firebase key (firebase-service-account.json)
Ye file **repo me nahi hai** (public repo me key leak hone par Google usko disable kar deta hai —
isi wajah se `[fb-token] exchange failed` aata hai). Nayi key banane ka tarika:

1. https://console.cloud.google.com/iam-admin/serviceaccounts → project chunein (`zayro-build`)
2. Service account `firebase-adminsdk-...` → **Keys** → **Add key → Create new key → JSON**
3. Download hui JSON file ko VPS par rakhein:
   ```bash
   nano ~/zayrobuild/firebase-service-account.json      # poora JSON paste karein
   cd ~/zayrobuild && node scripts/diag-firebase-auth.js # "TOKEN MILA ✅" aana chahiye
   pm2 restart zayro-panel --update-env && pm2 save
   ```
4. Ye bhi check karein: `date -u` (ghadi galat ho to `sudo timedatectl set-ntp true`)

Bina key ke panel poora chalta hai — sirf **live links (Firebase RTDB) wale features** off rehte hain.

### Config badalna (PORT, token, etc.)
```bash
nano ~/zayrobuild/.env
pm2 restart zayro-panel --update-env && pm2 save
```
`.env` ignored hai, isliye aapki changes `git pull` ko kabhi nahi rokengi.
(Naya clone: `.env` first boot par `.env.example` se ban jaati hai.)

### Database (pull-safe)
- Live DB `database/apkbuilder.db` **git me tracked nahi** hai — server use har second likhta hai,
  isliye tracked rakhne par har `git pull` par conflict aata tha.
- Repo me `database/apkbuilder.seed.db` hai (aapke 37 designs + settings, users khali).
  Pehli baar server chalne par ye khud `apkbuilder.db` ban jaati hai.
- **Update lena:**
  ```bash
  cd ~/zayrobuild
  git pull
  pm2 restart zayro-panel --update-env && pm2 save
  ```
  Aapka apna data (users, orders, coins) safe rehta hai — pull us file ko chhoota hi nahi.
- Fresh start chahiye to: `pm2 stop zayro-panel && mv database/apkbuilder.db database/apkbuilder.db.purana && pm2 start zayro-panel`

Panel me sabse zaroori settings (Admin → Settings se):
- **Store name + Brand logo** (logo header aur loading screen par dikhta hai)
- **UPI ID / QR** (wallet deposit ke liye)
- **Support username / channel URL / admin Telegram ID**
- **Deploy Bot plans** + service ON/OFF
- Telegram bot token / log channel purane legacy dashboard se manage hote hain

## Apne domain par host karna (jaiclub5vip.site)

Telegram Mini App **HTTPS** maangta hai, isliye panel ko nginx ke peeche apne domain par chalayein.

```bash
# 1) panel usi port par chalao jahan nginx bhejta hai (yahan 3000)
#    .env me: PORT=3000   →  pm2 restart zayro-panel && pm2 save

# 2) nginx config
sudo nano /etc/nginx/sites-available/jaiclub5vip.site
```

```nginx
server {
    listen 80;
    server_name jaiclub5vip.site;

    client_max_body_size 200M;          # APK / icon / screenshot uploads

    location / {
        proxy_pass http://127.0.0.1:3000;   # .env ka PORT yahi ho
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;            # APK build lamba chalta hai
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jaiclub5vip.site /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d jaiclub5vip.site        # free HTTPS certificate
```

Phir **Admin → Settings → Site URL** me `https://jaiclub5vip.site` daalein — bot ke "Open Builder Panel"
button isi URL par jaate hain (ye setting `.env` ke `SITE_URL` se upar chalti hai).
BotFather me bhi bot ke **Menu Button / Mini App** URL me yahi link rakhein.

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
