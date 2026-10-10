'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sdkRoot, assertAndroidSdk, findSdkManager, BUILD_TOOLS_VERSION, PLATFORM_VERSION, SDK_PACKAGES } = require('../utils/android-sdk');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(root, name, data = 'fixture') {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}
test('SDK environment precedence and fallback', () => {
  assert.equal(sdkRoot({}), '/opt/android-sdk');
  assert.equal(sdkRoot({ ANDROID_SDK_ROOT: '/sdk' }), '/sdk');
  assert.equal(sdkRoot({ ANDROID_HOME: '/home-sdk', ANDROID_SDK_ROOT: '/other' }), '/home-sdk');
});
test('missing SDK fails with actionable diagnostic', t => {
  assert.throws(() => assertAndroidSdk(fixture(t)), /platforms\/android-34\/android.jar.*npm run android:setup/);
});
test('required files accepted; absent or empty licence rejected', t => {
  const root = fixture(t);
  write(root, `platforms/android-${PLATFORM_VERSION}/android.jar`);
  for (const name of ['aapt', 'aapt2', 'apksigner', 'zipalign']) write(root, `build-tools/${BUILD_TOOLS_VERSION}/${name}`);
  assert.throws(() => assertAndroidSdk(root), /licenses\/android-sdk-license/);
  write(root, 'licenses/android-sdk-license', '');
  assert.throws(() => assertAndroidSdk(root), /licenses\/android-sdk-license/);
  write(root, 'licenses/android-sdk-license');
  assert.equal(assertAndroidSdk(root), root);
});
test('sdkmanager discovers versioned installation and prefers latest', t => {
  const root = fixture(t);
  assert.equal(findSdkManager(root), undefined);
  const versioned = write(root, 'cmdline-tools/19.0/bin/sdkmanager');
  fs.chmodSync(versioned, 0o755);
  assert.equal(findSdkManager(root), versioned);
  const latest = write(root, 'cmdline-tools/latest/bin/sdkmanager');
  fs.chmodSync(latest, 0o755);
  assert.equal(findSdkManager(root), latest);
});
test('Gradle and provisioner versions stay aligned', () => {
  const gradle = fs.readFileSync(path.join(__dirname, '../android-project/app/build.gradle'), 'utf8');
  assert.ok(gradle.includes(`compileSdk ${PLATFORM_VERSION}`));
  assert.ok(gradle.includes(`buildToolsVersion "${BUILD_TOOLS_VERSION}"`));
  assert.ok(SDK_PACKAGES.includes(`build-tools;${BUILD_TOOLS_VERSION}`));
});
