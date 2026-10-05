#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# update.sh — Zayro panel ko safely update karo (VPS par sabse aasan tareeka)
#
#   bash scripts/update.sh
#
# Ye kya karta hai:
#   1. Aapki volatile files ki backup leta hai (firebase key, .env, live DB)
#   2. Un files ko repo-version par reset karta hai (inhi ki wajah se `git pull` rukta tha)
#   3. git pull karta hai
#   4. Aapki files wapas rakhta hai (aapka data safe)
#   5. pm2 process restart karta hai (agar pm2 me zayro-panel hai)
#
# Aapka data kabhi nahi jaata: users, orders, coins sab live DB me hi rehte hain.
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd "$(dirname "$0")/.." || exit 1

BACKUP_DIR="${ZAYRO_BACKUP_DIR:-/root/zayro-update-backup}"
VOLATILE=("firebase-service-account.json" ".env" "database/apkbuilder.db")

echo "═══ ZAYRO UPDATE ═══"
mkdir -p "$BACKUP_DIR"

# 1) backup
for f in "${VOLATILE[@]}"; do
  if [ -e "$f" ]; then
    cp -a "$f"* "$BACKUP_DIR"/ 2>/dev/null || true
    echo "[1/5] backup → $f"
  fi
done
# DB ke WAL/SHM bhi (agar hain)
cp -a database/apkbuilder.db-wal database/apkbuilder.db-shm "$BACKUP_DIR"/ 2>/dev/null || true

# 2) reset (sirf tracked files par asar karega)
git checkout -- "${VOLATILE[@]}" 2>/dev/null || true
echo "[2/5] volatile files reset"

# 3) pull
echo "[3/5] git pull…"
if ! git pull --ff-only; then
  echo ""
  echo "❌ Pull nahi hua. Neeche wali files local me badli hui hain:"
  git status --short | grep -vE "node_modules|backups/" | head -10
  echo ""
  echo "   Fix (data safe rehta hai):  git stash push -u  →  git pull  →  git stash pop"
  echo "   Ya un files ko chhod dein:  git checkout -- <file>"
  exit 1
fi

# 4) restore
for f in "${VOLATILE[@]}"; do
  b="$BACKUP_DIR/$(basename "$f")"
  if [ -e "$b" ]; then
    if [ "$(basename "$f")" = "apkbuilder.db" ]; then
      cp -a "$BACKUP_DIR"/apkbuilder.db* database/ 2>/dev/null || true
    else
      cp -a "$b" "$f"
    fi
    echo "[4/5] restore → $f"
  fi
done

# 5) restart
if command -v pm2 >/dev/null 2>&1 && pm2 list 2>/dev/null | grep -q "zayro-panel"; then
  echo "[5/5] pm2 restart zayro-panel"
  pm2 restart zayro-panel --update-env >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && echo "      ✓ chal raha hai"
else
  echo "[5/5] pm2 nahi mila — server khud start karein:  node server.js"
fi

echo ""
echo "✅ Update poora. Ab kholein: https://jaiclub5vip.site"
