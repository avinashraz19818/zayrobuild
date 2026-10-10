#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# doctor.sh — poore panel ka health check ek command me
#
#   bash scripts/doctor.sh
#
# Check karta hai: pm2 process, port, local panel, public URL, .env, Firebase key,
# database, git version — aur har cheez par ✅ / ❌ deta hai.
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd "$(dirname "$0")/.." || exit 1

PASS=0; FAIL=0; WARN=0
ok()   { echo "  ✅ $1"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
warn() { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

envval() { # .env se key ki value
  [ -f .env ] || return 1
  grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

PORT="$(envval PORT || true)"; PORT="${PORT:-3000}"
SITE="$(envval SITE_URL || true)"
BASE="$(envval BASE_URL || true)"
PUBLIC_URL="${SITE:-$BASE}"

echo "═══ ZAYRO PANEL — DOCTOR ═══"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

echo "[1] Process (pm2)"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list 2>/dev/null | grep -q "zayro-panel"; then
    STATUS="$(pm2 jlist 2>/dev/null | node -e "
      let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
        try{
          const list=JSON.parse(d).filter(p=>/zayro-panel/.test(p.name));
          const p=list[0]||{};
          console.log((p.pm2_env&&p.pm2_env.status)||'unknown', '| restarts:', (p.pm2_env&&p.pm2_env.restart_time)||0);
        }catch(e){console.log('parse-fail')}
      });" 2>/dev/null)"
    if echo "$STATUS" | grep -q "^online"; then ok "zayro-panel $STATUS"; else bad "zayro-panel $STATUS (pm2 restart zayro-panel)"; fi
  else
    bad "zayro-panel pm2 me nahi hai (pm2 start server.js --name zayro-panel)"
  fi
else
  warn "pm2 installed nahi hai (node server.js se chala rahe hain?)"
fi

echo ""
echo "[2] Port + local panel"
if ss -ltn 2>/dev/null | grep -q ":$PORT "; then ok "port $PORT sun raha hai"; else bad "port $PORT par kuch nahi (pm2 logs zayro-panel)"; fi
CODE_LOCAL="$(curl -4 -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT/" 2>/dev/null || true)"
CODE_LOCAL="${CODE_LOCAL:-000}"
[ "$CODE_LOCAL" = "200" ] && ok "http://127.0.0.1:$PORT → 200" || bad "http://127.0.0.1:$PORT → $CODE_LOCAL"

echo ""
echo "[3] Public URL"
if [ -n "$PUBLIC_URL" ]; then
  CODE_PUB="$(curl -4 -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/" 2>/dev/null || true)"
  CODE_PUB="${CODE_PUB:-000}"
  if [ "$CODE_PUB" = "200" ]; then
    ok "$PUBLIC_URL → 200"
  elif [ "$CODE_PUB" = "000" ]; then
    bad "$PUBLIC_URL → connect nahi hua (VPS se: nginx + DNS check karein; bahar se khul raha ho to bhi ye warning aa sakti hai)"
  else
    bad "$PUBLIC_URL → $CODE_PUB (nginx/domain check karein)"
  fi
  case "$PUBLIC_URL" in
    *trycloudflare.com*|*ngrok*|*loca.lt*|*localtunnel*)
      warn "Ye temporary tunnel URL hai — band hote hi dead ho jaayega. scripts/set-site-url.js se permanent domain set karein." ;;
  esac
else
  warn "SITE_URL set nahi — bot ke buttons kaam nahi karenge (node scripts/set-site-url.js https://aapka-domain)"
fi
# Bot me jo URL ja raha hai wo DB setting se aata hai
DB_URL_SET="$(node -e "
  try{const db=require('./database/db');const v=db.prepare(\"SELECT value FROM settings WHERE key='site_url'\").get()?.value||'';console.log(v);}catch(e){console.log('')}
" 2>/dev/null)"
if [ -n "$DB_URL_SET" ]; then ok "bot ka site_url (DB): $DB_URL_SET"; else warn "DB me site_url khali hai"; fi

echo ""
echo "[4] .env"
for k in SESSION_SECRET TELEGRAM_BOT_TOKEN ADMIN_PASSWORD_HASH KEYSTORE_PASSWORD FIREBASE_DATABASE_URL; do
  V="$(envval "$k" || true)"
  if [ -n "$V" ]; then ok "$k set"; else bad "$k khali/na hai"; fi
done
V="$(envval SESSION_SECRET || true)"
[ -n "$V" ] && [ "${#V}" -lt 32 ] && warn "SESSION_SECRET 32 characters se chhota hai"

echo ""
echo "[5] Firebase"
if [ -f firebase-service-account.json ]; then
  if node -e "const j=JSON.parse(require('fs').readFileSync('firebase-service-account.json','utf8'));if(!j.client_email||!j.private_key)process.exit(1)" 2>/dev/null; then
    PROJECT="$(node -e "console.log(JSON.parse(require('fs').readFileSync('firebase-service-account.json','utf8')).project_id||'')" 2>/dev/null)"
    ok "service account OK (project: ${PROJECT:-?})"
    case "$(envval FIREBASE_DATABASE_URL || true)" in
      *"$PROJECT"*) ok "FIREBASE_DATABASE_URL project se match karta hai" ;;
      "")            warn "FIREBASE_DATABASE_URL set nahi" ;;
      *)             warn "FIREBASE_DATABASE_URL ka project service account se alag lag raha hai — ek hi project rakhein" ;;
    esac
  else
    bad "firebase-service-account.json me client_email/private_key nahi"
  fi
else
  warn "firebase-service-account.json nahi hai — live links features off rahenge"
fi

echo ""
echo "[6] Database"
if [ -f database/apkbuilder.db ]; then
  node -e "
    const db=require('./database/db');
    const c=(t)=>{try{return db.prepare('SELECT COUNT(*) c FROM '+t).get().c}catch(e){return '-'}};
    console.log('  ✅ DB OK — designs:', c('designs'), '| users:', c('users'), '| orders:', c('orders'), '| gift codes:', c('gift_codes'));
  " 2>/dev/null || bad "DB file hai par khul nahi rahi"
else
  warn "database/apkbuilder.db nahi hai — pehli boot par seed se ban jaayegi"
fi

echo ""
echo "[7] Version"
echo "  📦 $(git log -1 --format='%h %s' 2>/dev/null | cut -c1-80 || echo 'git info nahi')"
echo "  🌿 $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
DIRTY="$(git status --short 2>/dev/null | grep -vE 'node_modules|backups/|^\?\?' | wc -l)"
[ "$DIRTY" = "0" ] && ok "working tree saaf" || warn "$DIRTY local file(s) badli hui hain (git status)"

echo ""
echo "─────────────────────────────"
echo "  ✅ pass: $PASS    ⚠️  warn: $WARN    ❌ fail: $FAIL"
echo "─────────────────────────────"
[ "$FAIL" = "0" ] && echo "Sab theek hai 🎉" || echo "Upar ke ❌ dekh kar fix karein (README → Troubleshooting)."
