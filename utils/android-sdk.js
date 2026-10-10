'use strict';

const fs = require('fs');
const path = require('path');

// Keep in sync with android-project/app/build.gradle (AGP 8.12).
const BUILD_TOOLS_VERSION = '35.0.0';
const PLATFORM_VERSION = '34';
const SDK_PACKAGES = ['platform-tools', `platforms;android-${PLATFORM_VERSION}`, `build-tools;${BUILD_TOOLS_VERSION}`];

function sdkRoot(env = process.env) {
  return path.resolve(env.ANDROID_HOME || env.ANDROID_SDK_ROOT || '/opt/android-sdk');
}

function assertAndroidSdk(root = sdkRoot()) {
  const required = [
    `platforms/android-${PLATFORM_VERSION}/android.jar`,
    ...['aapt', 'aapt2', 'apksigner', 'zipalign'].map(name => `build-tools/${BUILD_TOOLS_VERSION}/${name}`),
    'licenses/android-sdk-license'
  ];
  const missing = required.filter(file => {
    try { const stat = fs.statSync(path.join(root, file)); return !stat.isFile() || stat.size === 0; }
    catch (_) { return true; }
  });
  if (missing.length) {
    throw new Error(`Android SDK incomplete at ${root}. Missing/empty: ${missing.join(', ')}. ` +
      'Run npm run android:setup on the build server as the panel service user, review/accept SDK licences, then retry. ' +
      'Use the same ANDROID_HOME in .env and the service environment.');
  }
  return root;
}

function findSdkManager(root = sdkRoot()) {
  const candidates = [path.join(root, 'cmdline-tools/latest/bin/sdkmanager'), path.join(root, 'tools/bin/sdkmanager')];
  const dir = path.join(root, 'cmdline-tools');
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).sort().reverse()) candidates.push(path.join(dir, name, 'bin/sdkmanager'));
  }
  return candidates.find(file => {
    try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); } catch (_) { return false; }
  });
}

module.exports = { BUILD_TOOLS_VERSION, PLATFORM_VERSION, SDK_PACKAGES, sdkRoot, assertAndroidSdk, findSdkManager };
