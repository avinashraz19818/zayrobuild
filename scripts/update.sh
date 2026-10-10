#!/usr/bin/env bash
# Back up safely, fast-forward the currently configured branch, install locked
# dependencies, and restart. NEVER reset/restore live data or stash secrets.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
BACKUP_ROOT="${ZAYRO_BACKUP_DIR:-$HOME/zayro-update-backup}"
mkdir -p "$BACKUP_ROOT"
BACKUP_DIR="$(mktemp -d "$BACKUP_ROOT/update-XXXXXXXX")"
chmod 700 "$BACKUP_DIR"
for f in .env firebase-service-account.json runtime/site-stock.key runtime/welcome.env runtime/welcome-bridge.key; do
  if [ -f "$f" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$f")"
    cp -p "$f" "$BACKUP_DIR/$f"
    chmod 600 "$BACKUP_DIR/$f"
  fi
done
# Never replace the signing identity during updates. Private recovery copy only.
if [ -d keystore ]; then cp -a keystore "$BACKUP_DIR/"; chmod -R go-rwx "$BACKUP_DIR/keystore"; fi
node scripts/backup-database.js "$BACKUP_DIR"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo 'Tracked local changes found. Review them manually; no files were reset or stashed.' >&2
  exit 1
fi
# Git/npm create application files too. Keep those readable by the web-service
# user; private backup directories/files above remain explicitly 0700/0600.
umask 022
git pull --ff-only
npm ci --omit=dev --no-audit --no-fund
# Repair generated assets left at 0600 by an earlier strict-umask update as well.
# Scope is public build output only: never relax DB, credentials or backup modes.
chmod 755 public public/assets
find public/assets -type d -exec chmod 755 {} +
find public/assets -type f -exec chmod 644 {} +
chmod 644 public/index.html public/build-manifest.json
node scripts/check-panel-startup.js
if command -v pm2 >/dev/null 2>&1 && pm2 describe zayro-panel >/dev/null 2>&1; then
  pm2 restart zayro-panel --update-env
  pm2 save
  echo 'Restart requested. Run the public startup check and real Telegram smoke test before declaring success.'
else
  echo 'Files updated. No managed process was restarted; start your configured service manually.'
fi
