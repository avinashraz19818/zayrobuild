'use strict';
// Existing integer ledger columns retain their names for old orders/refunds.
// Their unit is now INR: no exchange-rate purchase/conversion layer remains.
function enableRupeeWallet(db) {
  db.transaction(() => {
    const get = key => db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value;
    const set = (key,value) => db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value));
    if (!get('wallet_inr_v1')) {
      set('wallet_previous_coin_rate',get('coin_rate') || '1');
      // Preserve what customers already paid on still-pending deposit requests.
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='coin_requests' AND type='table'").get()) {
        db.prepare("UPDATE coin_requests SET coins_requested=amount_paid WHERE status='pending' AND amount_paid>0").run();
      }
      set('wallet_inr_v1','1');
    }
    set('coin_rate','1'); // Compatibility response only, not configurable.
    set('wallet_currency','INR');
  })();
}
module.exports = { enableRupeeWallet };
