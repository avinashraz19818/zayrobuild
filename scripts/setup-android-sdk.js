#!/usr/bin/env node
'use strict';

// Run from repository root; same .env as server.js. Existing service env wins.
require('dotenv').config();
const { spawnSync } = require('child_process');
const { sdkRoot, assertAndroidSdk, findSdkManager, SDK_PACKAGES } = require('../utils/android-sdk');

try {
  const root = sdkRoot();
  if (process.argv.includes('--check')) {
    assertAndroidSdk(root);
    console.log(`Android SDK files/licence file present: ${root} (Gradle validates licence revisions).`);
  } else {
    const manager = findSdkManager(root);
    if (!manager) throw new Error(`sdkmanager not found under ${root}. Install Android Command-line Tools into ${root}/cmdline-tools/latest first.`);
    const env = { ...process.env, ANDROID_HOME: root, ANDROID_SDK_ROOT: root };
    function run(args) {
      const result = spawnSync(manager, [`--sdk_root=${root}`, ...args], { env, stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`sdkmanager failed (${result.signal || result.status}); check Java 17+, SDK write permissions and network access.`);
    }
    console.log(`SDK: ${root}\nReview the licence prompts and accept only if you agree. Run as the panel service user.`);
    run(['--licenses']);
    run(SDK_PACKAGES);
    assertAndroidSdk(root);
    console.log('Android SDK setup complete. Retry the failed build.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
