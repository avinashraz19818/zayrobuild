"""Interactive VPS-only setup; credentials never pass through chat or shell arguments."""
import getpass
import os
import re
import secrets
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
runtime = ROOT / 'runtime'
runtime.mkdir(mode=0o700, exist_ok=True)
config = runtime / 'welcome.env'
if config.exists():
    raise SystemExit('Configuration exists; not overwriting it.')
print('Use a NEW manager bot token, different from the APK/store bot and customer bots.')
token = getpass.getpass('Manager token (hidden): ').strip()
if not re.fullmatch(r'\d{6,}:[A-Za-z0-9_-]{20,}', token):
    raise SystemExit('Invalid token format.')
admins = input('Operator Telegram numeric IDs (comma separated): ').strip()
if not re.fullmatch(r'[1-9]\d{4,15}(,[1-9]\d{4,15})*', admins):
    raise SystemExit('Invalid operator IDs.')
username = input('Operator support username (without @): ').strip().lstrip('@')
if not re.fullmatch(r'[A-Za-z0-9_]{5,32}',username):
    raise SystemExit('Invalid Telegram username.')
print('Enter a dedicated PostgreSQL connection URL, or leave blank to create a new local database (root required).')
url = getpass.getpass('Database URL (hidden, optional): ').strip()
if not url:
    if os.geteuid() != 0:
        raise SystemExit('Run as root for automatic local database setup, or supply a database URL.')
    check = subprocess.run(['runuser','-u','postgres','--','psql','-XAtc',"SELECT 1 FROM pg_roles WHERE rolname='zayro_welcome'"],check=True,capture_output=True,text=True)
    if check.stdout.strip():
        raise SystemExit('Database role already exists. Supply its URL; setup will not reset an existing password/database.')
    password = secrets.token_hex(24)
    sql = f"CREATE ROLE zayro_welcome LOGIN PASSWORD '{password}';\nCREATE DATABASE zayro_welcome OWNER zayro_welcome;\n"
    subprocess.run(['runuser','-u','postgres','--','psql','-Xq','-v','ON_ERROR_STOP=1'],input=sql,text=True,check=True)
    url = f'postgresql://zayro_welcome:{password}@127.0.0.1:5432/zayro_welcome'
if not url.startswith(('postgresql://','postgres://')) or '\n' in url:
    raise SystemExit('Invalid database URL.')
keyfile=runtime/'welcome-bridge.key'
if not keyfile.exists():
    fd=os.open(keyfile,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f: f.write(secrets.token_hex(32)+'\n')
fd=os.open(config,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
with os.fdopen(fd,'w') as f:
    f.write(f'MAIN_BOT_TOKEN={token}\nDATABASE_URL={url}\nADMIN_USER_IDS={admins}\nADMIN_USERNAME={username}\nFORCE_IPV4=1\nWELCOME_BRIDGE_PORT=8787\n')
print('Private runtime configuration saved. No credentials were printed.')
