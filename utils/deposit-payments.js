'use strict';
const crypto=require('crypto');
const KEYS=['upi_id','usdt_trc20_address','usdt_bep20_address','usdt_inr_rate','usdt_bonus_percent'];
const addressOK=(method,value)=>method==='upi'?/^[a-zA-Z0-9._-]{2,200}@[a-zA-Z0-9.-]{2,80}$/.test(value):method==='trc20'?/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value):method==='bep20'?/^0x[0-9a-fA-F]{40}$/.test(value):false;
const bonusFor=(q,base)=>q.bonus_bps===0&&q.bonus_inr>0?Math.floor(base*q.bonus_inr/q.base_inr):Math.floor(base*q.bonus_bps/10000);
const fail=message=>{throw Object.assign(new Error(message),{public:true});};
function decimal(value,max){const s=String(value??'');if(!/^\d+(?:\.\d{1,2})?$/.test(s)||Number(s)>max)fail('Use a valid amount with up to two decimal places.');return Math.round(Number(s)*100);}
function validateSettings(body){
 for(const key of KEYS){if(body[key]===undefined||body[key]==='')continue;
  if(typeof body[key]!=='string')fail('Invalid payment setting.');
  if(key==='upi_id'&&!addressOK('upi',body[key].trim()))fail('Enter a valid UPI ID.');
  if(key.includes('_address')&&!addressOK(key.includes('trc20')?'trc20':'bep20',body[key].trim()))fail('Enter a valid receiving address for the selected network.');
  if(key==='usdt_inr_rate'&&decimal(body[key],10000)<1)fail('Set a positive INR value for 1 USDT.');
  if(key==='usdt_bonus_percent')decimal(body[key],50);
 }
}
function createDeposits(db,{now=()=>Date.now(),env=process.env}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS deposit_quotes(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,method TEXT NOT NULL,amount TEXT NOT NULL,address TEXT NOT NULL,rate REAL NOT NULL,base_inr INTEGER NOT NULL,bonus_inr INTEGER NOT NULL,credit_inr INTEGER NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,request_id INTEGER UNIQUE);
 CREATE TABLE IF NOT EXISTS crypto_review_adjustments(id INTEGER PRIMARY KEY,request_id INTEGER NOT NULL,old_credit INTEGER NOT NULL,new_credit INTEGER NOT NULL,received_amount TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS crypto_review_details(request_id INTEGER PRIMARY KEY,received_amount TEXT NOT NULL,note TEXT NOT NULL DEFAULT '');
 CREATE INDEX IF NOT EXISTS deposit_quotes_user ON deposit_quotes(user_id,created_at);`);
 if(!db.prepare('PRAGMA table_info(deposit_quotes)').all().some(c=>c.name==='bonus_bps'))db.exec('ALTER TABLE deposit_quotes ADD COLUMN bonus_bps INTEGER NOT NULL DEFAULT 0');
 const automatic=require('./crypto-payments').createCrypto(db,{now,env});
 const settings=()=>Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(r=>[r.key,r.value]));
 function quote(userId,body){return db.transaction(()=>{
  if(!db.prepare('SELECT id FROM users WHERE id=?').get(userId))fail('Customer not found.');
  if(db.prepare('SELECT count(*) n FROM deposit_quotes WHERE user_id=? AND created_at>?').get(userId,now()-3600000).n>=30)fail('Too many payment requests. Please use an existing payment or try later.');
  const method=body.method,s=settings();if(!['upi','trc20','bep20'].includes(method))fail('Select a supported payment method.');
  const address=String(s[method==='upi'?'upi_id':`usdt_${method}_address`]||'').trim();if(!addressOK(method,address))fail('This payment method is not configured. Contact support.');
  const units=decimal(body.amount,method==='upi'?1000000:10000);
  if(units<(method==='upi'?100:1000)||(method==='upi'&&units%100))fail(method==='upi'?'Enter a whole-rupee amount, minimum ₹1.':'Minimum deposit is 10 USDT.');
  const rate=method==='upi'?100:decimal(s.usdt_inr_rate,10000);if(!rate)fail('USDT conversion rate is not configured.');
  const bonusRate=method==='upi'?0:decimal(s.usdt_bonus_percent||'0',50);
  const base=Math.floor(units*rate/10000),bonus=Math.floor(base*bonusRate/10000),credit=base+bonus;
  if(credit<1||credit>1000000)fail('Wallet credit must be between ₹1 and ₹10,00,000.');
  const amount=(units/100).toFixed(2),id=crypto.randomUUID();
  const payload=method==='upi'?`upi://pay?${new URLSearchParams({pa:address,pn:String(s.site_name||'Store').slice(0,80),am:amount,cu:'INR',tn:'Wallet top-up'})}`:address;
  db.prepare('INSERT INTO deposit_quotes(id,user_id,method,amount,address,rate,base_inr,bonus_inr,credit_inr,payload,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,userId,method,amount,address,rate/100,base,bonus,credit,payload,now());
  db.prepare('UPDATE deposit_quotes SET bonus_bps=? WHERE id=?').run(bonusRate,id);
  return automatic.reserve(db.prepare('SELECT * FROM deposit_quotes WHERE id=?').get(id));
 })();}
 function submit(userId,body,screenshot){return db.transaction(()=>{
  const q=db.prepare('SELECT * FROM deposit_quotes WHERE id=? AND user_id=?').get(String(body.quote_id||''),userId);
  if(!q)fail('Payment details not found. Start a new deposit.');
  if(q.request_id)return {row:db.prepare('SELECT * FROM coin_requests WHERE id=?').get(q.request_id),reused:true};
  const raw=String(body.utr||'').trim(),ref=q.method==='upi'?raw:raw.replace(/^0x/i,'').toLowerCase();
  if(!(q.method==='upi'?/^\d{12}$/.test(ref):/^[0-9a-f]{64}$/.test(ref)))fail(q.method==='upi'?'Enter the 12-digit UTR from your payment.':'Enter the full 64-character transaction hash (TXID).');
  if(!screenshot)fail('Payment screenshot is required for manual verification.');
  const stored=q.method==='upi'?ref:`${q.method}:${ref}`;
  if(db.prepare("SELECT id FROM coin_requests WHERE lower(trim(utr))=? AND status IN ('pending','approved')").get(stored))fail('This payment reference has already been submitted. Check deposit history or contact support.');
  let credit=q.credit_inr,base=q.base_inr,bonus=q.bonus_inr,reported=q.amount;
  if(q.method!=='upi'&&body.received_amount!==undefined){
   const micro=require('./crypto-payments').micros(body.received_amount);reported=require('./crypto-payments').text(micro);
   if(micro!==require('./crypto-payments').micros(q.amount)){base=Number(micro*BigInt(Math.round(q.rate*100))/100000000n);bonus=bonusFor(q,base);credit=base+bonus;}
   if(credit<1||credit>1000000)fail('Received amount must give a credit between ₹1 and ₹10,00,000.');
  }
  if(q.method!=='upi'&&automatic.view(q.id,userId)?.automatic&&body.received_amount===undefined)fail('Enter the actual USDT amount sent.');
  if(db.prepare('SELECT 1 FROM crypto_credits WHERE network=? AND txid=?').get(q.method,ref))fail('This transfer was already credited.');
  const seen=db.prepare('SELECT matched_quote FROM crypto_observations WHERE network=? AND txid=?').get(q.method,ref);
  if(seen?.matched_quote&&seen.matched_quote!==q.id)fail('This transfer belongs to a different payment invoice. Contact support.');
  const r=db.prepare('INSERT INTO coin_requests(user_id,coins_requested,amount_paid,utr,screenshot_file) VALUES(?,?,?,?,?)').run(userId,credit,base,stored,screenshot);
  db.prepare('UPDATE deposit_quotes SET request_id=? WHERE id=?').run(r.lastInsertRowid,q.id);
  db.prepare("UPDATE crypto_invoices SET state='review' WHERE quote_id=?").run(q.id);
  db.prepare('INSERT INTO crypto_review_details(request_id,received_amount,note) VALUES(?,?,?)').run(r.lastInsertRowid,reported,String(body.note||'').slice(0,500));
  return {row:{...db.prepare('SELECT * FROM coin_requests WHERE id=?').get(r.lastInsertRowid),payment_method:q.method,payment_amount:reported,payment_address:q.address,payment_rate:q.rate,payment_bonus:bonus,payment_note:String(body.note||'').slice(0,500)},reused:false};
 })();}
 function correctReceived(id,received){return db.transaction(()=>{
  const row=db.prepare('SELECT * FROM coin_requests WHERE id=?').get(id),q=db.prepare('SELECT * FROM deposit_quotes WHERE request_id=?').get(id);
  if(!row||row.status!=='pending'||!q||q.method==='upi')fail('Only pending USDT requests can be corrected.');
  const micro=require('./crypto-payments').micros(received),amount=require('./crypto-payments').text(micro);
  const same=micro===require('./crypto-payments').micros(q.amount);
  const base=same?q.base_inr:Number(micro*BigInt(Math.round(q.rate*100))/100000000n),bonus=same?q.bonus_inr:bonusFor(q,base),credit=base+bonus;
  if(credit<1||credit>1000000)fail('Credit must be between ₹1 and ₹10,00,000.');
  db.prepare('INSERT INTO crypto_review_adjustments(request_id,old_credit,new_credit,received_amount,created_at) VALUES(?,?,?,?,?)').run(id,row.coins_requested,credit,amount,now());
  db.prepare('UPDATE coin_requests SET coins_requested=?,amount_paid=? WHERE id=?').run(credit,base,id);
  db.prepare('INSERT INTO crypto_review_details(request_id,received_amount) VALUES(?,?) ON CONFLICT(request_id) DO UPDATE SET received_amount=excluded.received_amount').run(id,amount);
  return {success:true,credit_inr:credit};
 })();}
 return {quote,submit,automatic,correctReceived};
}
module.exports={KEYS,addressOK,validateSettings,createDeposits};
