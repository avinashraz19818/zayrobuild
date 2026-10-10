#!/usr/bin/env bash
# Run on the VPS from the zayrobuild checkout. Does not touch APK signing/builds.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
command -v pm2 >/dev/null || { echo 'Install PM2 before running this setup.'; exit 1; }
command -v python3 >/dev/null || { echo 'Install python3 and python3-venv first.'; exit 1; }
mkdir -p runtime
chmod 700 runtime
if [ ! -f runtime/welcome.env ]; then
  if ! command -v psql >/dev/null; then
    echo 'PostgreSQL is required. Ubuntu/Debian: apt-get update && apt-get install -y postgresql python3-venv'
    exit 1
  fi
  python3 scripts/configure-welcome-bot.py
fi
[ -f runtime/welcome-bridge.key ] || { echo 'Missing runtime/welcome-bridge.key; restore it from your private backup. Do not rotate it while purchases are pending.'; exit 1; }
python3 -m venv runtime/welcome-venv
runtime/welcome-venv/bin/pip install -r services/welcome-bot/requirements.txt
if pm2 describe zayro-welcome >/dev/null 2>&1; then
  pm2 restart zayro-welcome --update-env
else
  pm2 start "$ROOT/services/welcome-bot/runner.py" --name zayro-welcome --interpreter "$ROOT/runtime/welcome-venv/bin/python" --cwd "$ROOT/services/welcome-bot"
fi
pm2 restart zayro-panel --update-env
pm2 save
echo 'Runtime started. Check: pm2 logs zayro-welcome --lines 30 --nostream'
echo 'Then open panel Admin > Deploy Bot > Plans & pricing. Set prices and publish plans.'
echo 'Keep runtime/welcome.env and runtime/welcome-bridge.key private and backed up.'
