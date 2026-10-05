#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-rules.sh — Firebase Realtime Database RULES ko VPS se deploy karo
#
# Rules (database.rules.json):
#   - ROOT read: sirf auth != null — bina auth ke pura database dump
#     IMPOSSIBLE (pehle .read:true tha, koi bhi saare panels ke links
#     nikal leta tha — yahi asli leak tha)
#   - har panel ka config/users read: apps ke liye open (purane APKs
#     bhi chalti rehti hain)
#   - config/push write: sirf auth != null (server service account) →
#     hacker kabhi link nahi badal sakta
#   - users write: open (apps ka registration tracking)
#
# Usage (VPS, project folder se):
#   bash scripts/deploy-rules.sh
# ─────────────────────────────────────────────────────────────────────────────
set -u

# Project id: FIREBASE_PROJECT_ID env → .env ka FIREBASE_DATABASE_URL → service account
resolve_project_id() {
  if [ -n "${FIREBASE_PROJECT_ID:-}" ]; then echo "$FIREBASE_PROJECT_ID"; return; fi
  local dburl=""
  if [ -f ".env" ]; then
    dburl="$(grep -E '^FIREBASE_DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '\r')"
  fi
  if [ -n "$dburl" ]; then
    echo "$dburl" | sed -E 's#^https://##; s#-default-rtdb.*$##; s#\..*$##'
    return
  fi
  echo "zayrodev-195f3"
}

PROJECT_ID="${FIREBASE_PROJECT_ID:-$(resolve_project_id)}"
SA_FILE="${GOOGLE_APPLICATION_CREDENTIALS:-$(pwd)/firebase-service-account.json}"
DB_URL="${FIREBASE_DATABASE_URL:-https://${PROJECT_ID}-default-rtdb.firebaseio.com}"
DB_URL="${DB_URL%/}"
echo "Project: ${PROJECT_ID}"
echo "DB URL : ${DB_URL}"
echo "SA     : ${SA_FILE}"

echo "═══ FIREBASE RULES DEPLOY ═══"
echo "[1/4] service account check..."
if [ ! -f "$SA_FILE" ]; then
  echo "❌ Service account file nahi mili: $SA_FILE" >&2
  exit 1
fi
node -e "try{JSON.parse(require('fs').readFileSync('$SA_FILE','utf8'));console.log('   JSON OK ✅')}catch(e){console.log('❌ JSON CORRUPT');process.exit(1)}" || exit 1

echo "[2/4] firebase-tools deploy (pehli baar ~1 min lagta hai)..."
cd "$(dirname "$0")/.."   # project root
GOOGLE_APPLICATION_CREDENTIALS="$SA_FILE" npx --yes firebase-tools@latest deploy \
  --only database \
  --project "$PROJECT_ID" \
  --non-interactive \
  2>&1 | tail -20

echo ""
echo "[3/4] verify — 3 probe tests:"

# Probe A: panel ka CONFIG — bina auth ke WRITE BLOCK hona chahiye (401)
CODE_A=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 \
  -X PUT "$DB_URL/arena_probe/config.json" -d '{"registerUrl":"https://hacker.com"}')
echo "   probe A (config write, bina auth): HTTP $CODE_A  [401 = taala laga ✅]"

# Probe B: panel ke USERS — bina auth ke ALLOWED (apps ka registration)
CODE_B=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 \
  -X PUT "$DB_URL/arena_probe/users.json" -d '{"9999999999":{"registered":true}}')
echo "   probe B (users write, bina auth):  HTTP $CODE_B  [200 = apps chalti hain ✅]"

# Probe C: ROOT read — bina auth ke BLOCK hona chahiye (401/403).
# Ye naya taala hai: pehle koi bhi .json se PURA DB dump kar leta tha.
CODE_C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$DB_URL/.json")
echo "   probe C (root read, bina auth):    HTTP $CODE_C  [401 = pura dump band ✅]"

# Cleanup probe junk (users delete allowed hai, baaki silently skip)
curl -s --max-time 20 -X DELETE "$DB_URL/arena_probe/users.json" > /dev/null
curl -s --max-time 20 -X DELETE "$DB_URL/arena_probe.json" > /dev/null

echo "[4/4] result:"
if { [ "$CODE_A" = "401" ] || [ "$CODE_A" = "403" ]; } && { [ "$CODE_C" = "401" ] || [ "$CODE_C" = "403" ]; }; then
  echo "✅✅✅ TAALA LAG GAYA!"
  echo "   - Hacker ab kisi bhi panel ka link change NAHI kar sakta"
  echo "   - Bina auth ke PURA DATABASE DUMP IMPOSSIBLE (root read band)"
  if [ "$CODE_B" = "200" ]; then
    echo "   (Purane apps read + registration tracking ab bhi chalti hai — sab normal.)"
  else
    echo "   ⚠️  users write bhi block hui (HTTP $CODE_B) — apps ka registration"
    echo "       track hona ruk sakta hai. Rules file check karo."
  fi
  echo "   (Admin link change + watchdog server token se chalte rahenge.)"
else
  echo "❌ Rules kaam nahi kar rahi (A=$CODE_A C=$CODE_C). Upar deploy ka"
  echo "   output check karo — error aayi ho to mujhe bhejo."
fi
