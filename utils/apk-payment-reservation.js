'use strict';
const reseller=require('./resellers');
const fail=message=>{const e=new Error(message);e.public=true;throw e;};
function schema(db){reseller.schema(db);db.exec(`CREATE TABLE IF NOT EXISTS apk_payment_keys(user_id INTEGER NOT NULL,request_key TEXT NOT NULL,order_id INTEGER NOT NULL,PRIMARY KEY(user_id,request_key));`);}
function existing(db,userId,key){if(!key)return null;return db.prepare('SELECT order_id FROM apk_payment_keys WHERE user_id=? AND request_key=?').get(userId,key);}
function reserve(db,{userId,key,total,quote,label,insert}){
 if(key && !/^[a-zA-Z0-9_-]{16,100}$/.test(key))fail('Invalid purchase request. Reload checkout.');
 if(quote.reseller&&!key)fail('Reload the panel to use reseller checkout.');
 return db.transaction(()=>{
  const previous=existing(db,userId,key);if(previous)return {orderId:previous.order_id,replayed:true};
  const debit=db.prepare('UPDATE users SET coins=ROUND(coins-?,2) WHERE id=? AND coins>=?').run(total,userId,total);
  if(!debit.changes)fail('Not enough wallet balance. Add funds first.');
  const orderId=Number(insert());
  reseller.record(db,userId,'apk',orderId,label,quote);
  if(key)db.prepare('INSERT INTO apk_payment_keys VALUES(?,?,?)').run(userId,key,orderId);
  return {orderId,replayed:false};
 })();
}
function refund(db,orderId,message){return db.transaction(()=>{
 const order=db.prepare('SELECT user_id,coins_spent FROM orders WHERE id=?').get(orderId);if(!order)return false;
 const changed=db.prepare("UPDATE orders SET status='failed',build_log=COALESCE(?,build_log) WHERE id=? AND status IN ('building','pending')").run(message||null,orderId);
 if(!changed.changes)return false;
 db.prepare('UPDATE users SET coins=ROUND(coins+?,2) WHERE id=?').run(order.coins_spent,order.user_id);
 reseller.refund(db,'apk',orderId);return true;
})();}
module.exports={schema,existing,reserve,refund};
