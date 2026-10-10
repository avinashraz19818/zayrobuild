'use strict';
function makePackageName(appName, counter = 1) {
  let name = String(appName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) || 'app';
  if (/^[0-9]/.test(name)) name = 'app' + name;
  const id = Number(counter);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('A positive unique package counter is required.');
  return `zayro.${name}${id}`;
}
function makeFakePackageName(primaryPackage, fakeNumber) {
  const number = Number(fakeNumber);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid fake APK number.');
  const primary = String(primaryPackage || 'app');
  // Preserve legacy fake identities when rebuilding existing orders.
  const legacy = ['com.app', 'com.client', 'com.service', 'com.pro', 'com.hub', 'com.portal', 'com.net', 'com.cloud'];
  const prefix = primary.startsWith('zayro.') ? 'zayro' : legacy[number % legacy.length];
  const name = primary.split('.').pop() || 'app';
  return `${prefix}.${name}f${number}`;
}
module.exports = { makePackageName, makeFakePackageName };
