'use strict';

// APK compilation uses Gradle child processes.
// Running in this short-lived worker process prevents blocking the API server.
const { buildApkInWorker } = require('./apkbuilder');

function sendToParent(message, exitCode = 0) {
  if (!process.connected) {
    process.exit(exitCode);
    return;
  }

  process.send(message, () => process.exit(exitCode));
}

process.once('message', async message => {
  if (!message || message.type !== 'build') {
    sendToParent({ type: 'error', error: 'Invalid build worker request' }, 1);
    return;
  }

  const log = text => {
    if (process.connected) {
      try { process.send({ type: 'log', message: String(text) }); }
      catch (_) {}
    }
  };

  try {
    const order = message.order;
    const design = message.design;
    const buildId = message.buildId;

    log('Building with Native Android Java Engine (Classic)...');
    const result = await buildApkInWorker(order, design, buildId, log);

    sendToParent({ type: 'result', result });
  } catch (error) {
    sendToParent({
      type: 'error',
      error: error?.stack || error?.message || String(error)
    }, 1);
  }
});
