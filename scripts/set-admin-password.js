'use strict';
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const newPass = process.argv[2] || 'shruti123';
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  console.error('.env not found!');
  process.exit(1);
}

const hash = bcrypt.hashSync(newPass, 12);
let content = fs.readFileSync(envPath, 'utf8');

if (content.includes('ADMIN_PASSWORD_HASH=')) {
  content = content.replace(/ADMIN_PASSWORD_HASH=.*/, `ADMIN_PASSWORD_HASH=${hash}`);
} else {
  content += `\nADMIN_PASSWORD_HASH=${hash}\n`;
}

fs.writeFileSync(envPath, content, 'utf8');
console.log(`[SUCCESS] Admin password successfully updated!`);
console.log(`Password: ${newPass}`);
console.log(`Hash written to .env: ${hash}`);
