'use strict';

// APK compilation uses Gradle or Flutter child processes.
// Running in this short-lived worker process prevents blocking the API server.
const { buildApkInWorker } = require('./apkbuilder');
const { buildFlutterApkInWorker } = require('./flutterbuilder');

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

    // Default engine: Native Android Java (Classic original builder)
    const engine = (process.env.APK_BUILD_ENGINE === 'flutter' || (order && order.build_engine === 'flutter_force')) ? 'flutter' : 'java';

    let result;
    if (engine === 'flutter') {
      log('Building with Flutter Engine...');
      result = await buildFlutterApkInWorker(order, design, buildId, log);
    } else {
      log('Building with Native Android Java Engine (Classic)...');
      result = await buildApkInWorker(order, design, buildId, log);
    }

    sendToParent({ type: 'result', result });
  } catch (error) {
    sendToParent({
      type: 'error',
      error: error?.stack || error?.message || String(error)
    }, 1);
  }
});
