'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { customerBuildStatus } = require('../utils/customer-build-status');
for (const status of ['pending', 'building', 'done', 'failed', 'unknown']) {
  test(`customer ${status} status never exposes private build data`, () => {
    const result = customerBuildStatus({ id: 5, status, apk_file: null, fake_apk_file: null,
      build_log: 'SECRET gradle command password', error: 'SECRET stack trace', private_key: 'SECRET' });
    assert.deepEqual(Object.keys(result).sort(), ['id', 'status', 'apk_file', 'fake_apk_file', 'progress_message'].sort());
    assert.equal(JSON.stringify(result).includes('SECRET'), false);
    assert.ok(result.progress_message);
    assert.equal(result.status, status);
  });
}
