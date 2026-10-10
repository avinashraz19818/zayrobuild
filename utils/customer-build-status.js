'use strict';

// Explicit allowlist: internal logs/errors must never reach customer status APIs.
function customerBuildStatus(order) {
  const messages = {
    pending: 'Order received. Waiting for an available build slot.',
    building: 'Your APK is being prepared. Please wait.',
    done: 'Your APK is ready to download.',
    failed: 'Build could not be completed. Please contact support with your order number.'
  };
  return {
    id: order.id,
    status: order.status,
    apk_file: order.apk_file,
    fake_apk_file: order.fake_apk_file,
    progress_message: messages[order.status] || 'Checking order status.'
  };
}
module.exports = { customerBuildStatus };
