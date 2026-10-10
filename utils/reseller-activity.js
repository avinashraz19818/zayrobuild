'use strict';
// Read fulfilment from service orders; do not equate a wallet debit with a delivered APK/bot.
module.exports=function activity(db,userId,range,today){
 const columns=table=>new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));
 const ap=columns('orders'),bo=columns('welcome_orders'),si=columns('site_sales');
 const a=(col,fallback="NULL")=>ap.has(col)?`o.${col}`:fallback;
 const b=(col,fallback="NULL")=>bo.has(col)?`b.${col}`:fallback;
 const w=(col,fallback="NULL")=>si.has(col)?`w.${col}`:fallback;
 const nonempty=expr=>`(${expr} IS NOT NULL AND ${expr} <> '')`;
 const units=si.has('lease_ids')?`CASE WHEN json_valid(w.lease_ids) THEN CASE WHEN json_type(w.lease_ids)='array' THEN json_array_length(w.lease_ids) ELSE 0 END ELSE 0 END`:'0';
 const source=`FROM reseller_sales s LEFT JOIN reseller_refunds r ON r.sale_id=s.id
 ${ap.has('id')?"LEFT JOIN orders o ON s.service='apk' AND o.id=s.order_id":''}
 ${bo.has('id')?"LEFT JOIN welcome_orders b ON s.service='bot' AND b.id=s.order_id":''}
 ${si.has('id')?"LEFT JOIN site_sales w ON s.service='site' AND w.id=s.order_id":''}`;
 const ok='r.sale_id IS NULL';
 const ready=`${ok} AND ${a('status')}='done'`;
 const real=`${ready} AND COALESCE(${a('design_variant')},'real')<>'fake' AND ${nonempty(a('apk_file'))}`;
 const fake=`${ready} AND (CASE WHEN ${a('design_variant')}='fake' THEN ${nonempty(a('apk_file'))} ELSE ${nonempty(a('fake_apk_file'))} END)`;
 const botReady=`${ok} AND ${b('status')} IN ('active','stopped','expired') AND COALESCE(${b('refunded','0')},0)=0`;
 const fields={
  apk_orders:"s.service='apk'",real_apks:real,fake_apks:fake,
  apk_pending:`s.service='apk' AND ${ok} AND ${a('status')} IN ('building','pending')`,
  apk_failed:`s.service='apk' AND ${a('status')}='failed'`,
  apk_refunded:"s.service='apk' AND r.sale_id IS NOT NULL",
  bot_orders:"s.service='bot'",bots:`${botReady} AND ${b('kind')}='deploy'`,bot_renewals:`${botReady} AND ${b('kind')}='renew'`,
  bot_pending:`s.service='bot' AND ${ok} AND ${b('status')} IN ('pending','provisioning')`,
  bot_failed:`s.service='bot' AND ${b('status')}='failed'`,bot_refunded:"s.service='bot' AND r.sale_id IS NOT NULL",
  site_orders:"s.service='site'",site_refunded:"s.service='site' AND r.sale_id IS NOT NULL"
 };
 const select=Object.entries(fields).map(([name,condition])=>`COALESCE(sum(CASE WHEN ${condition} THEN 1 ELSE 0 END),0) ${name}`).join(',');
 const query=(extra='',args=[])=>db.prepare(`SELECT ${select},
 COALESCE(sum(CASE WHEN s.service='site' AND ${ok} AND ${w('kind')}='purchase' THEN ${units} ELSE 0 END),0) site_accounts,
 COALESCE(sum(CASE WHEN s.service='site' AND ${ok} AND ${w('kind')}='renew' THEN ${units} ELSE 0 END),0) site_renewals
 ${source} WHERE ${userId?'s.user_id=?':'1=1'} ${extra}`).get(...(userId?[userId]:[]),...args);
 return {lifetime:query(),today:query("AND date(s.created_at,'+5 hours','+30 minutes')=?",[today]),period:query("AND date(s.created_at,'+5 hours','+30 minutes') BETWEEN ? AND ?",[range.from,range.to]),today_date:today};
};
