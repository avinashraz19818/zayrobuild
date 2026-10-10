'use strict';
// No keys/signing here. Only confirmed observations from server-owned readers.
const SCALE=1000000n;
const fail=m=>{throw Object.assign(new Error(m),{public:true});};
function micros(value){if(!/^\d+(?:\.\d{1,6})?$/.test(String(value)))fail('Enter USDT with up to 6 decimal places.');const [a,b='']=String(value).split('.');const n=BigInt(a)*SCALE+BigInt(b.padEnd(6,'0'));if(n<=0n||n>10001n*SCALE)fail('Invalid received USDT amount.');return n;}
const text=n=>`${n/SCALE}.${String(n%SCALE).padStart(6,'0')}`;
const address=(network,a)=>network==='bep20'?String(a).toLowerCase():String(a);
function schema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS crypto_invoices(quote_id TEXT PRIMARY KEY,network TEXT NOT NULL,address TEXT NOT NULL,amount_micro TEXT NOT NULL,expires_at INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'waiting',txid TEXT,UNIQUE(network,address,amount_micro));
 CREATE TABLE IF NOT EXISTS crypto_credits(network TEXT NOT NULL,txid TEXT NOT NULL,quote_id TEXT,request_id INTEGER,PRIMARY KEY(network,txid));
 CREATE TABLE IF NOT EXISTS crypto_observations(network TEXT NOT NULL,txid TEXT NOT NULL,address TEXT NOT NULL,amount_micro TEXT NOT NULL,block_time INTEGER NOT NULL,matched_quote TEXT,state TEXT NOT NULL,PRIMARY KEY(network,txid));
 CREATE TABLE IF NOT EXISTS crypto_cursors(network TEXT NOT NULL,address TEXT NOT NULL,cursor TEXT NOT NULL DEFAULT '{}',last_ok INTEGER,error TEXT,PRIMARY KEY(network,address));
 CREATE TABLE IF NOT EXISTS crypto_notices(quote_id TEXT PRIMARY KEY,sent INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0);
 `);for(const column of ['attempts','next_at'])if(!db.prepare('PRAGMA table_info(crypto_notices)').all().some(c=>c.name===column))db.exec(`ALTER TABLE crypto_notices ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);}
function createCrypto(db,{now=()=>Date.now(),env=process.env}={}){
 schema(db);
 function enabled(network){return ['trc20','bep20'].includes(network)&&env[`USDT_${network.toUpperCase()}_AUTO`]==='true'&&Boolean(network==='bep20'?env.BSC_RPC_URL:env.TRONGRID_API_KEY);}
 function reserve(q){if(!enabled(q.method))return q;
  if(q.method==='trc20'){try{require('./crypto-readers').tronHex(q.address);}catch{fail('Receiving TRC20 address checksum is invalid. Contact support.');}}
  const to=address(q.method,q.address),base=micros(q.amount);
  // Permanent reservation, never recycled, including expired/cancelled invoices.
  let amount;for(let n=1n;n<10000n;n++){const candidate=base+n;if(!db.prepare('SELECT 1 FROM crypto_invoices WHERE network=? AND address=? AND amount_micro=?').get(q.method,to,String(candidate))){amount=candidate;break;}}
  if(!amount)fail('This amount is temporarily unavailable. Choose a different amount.');
  db.prepare('INSERT INTO crypto_invoices(quote_id,network,address,amount_micro,expires_at) VALUES(?,?,?,?,?)').run(q.id,q.method,to,String(amount),now()+30*60000);
  db.prepare('UPDATE deposit_quotes SET amount=? WHERE id=?').run(text(amount),q.id);
  return view(q.id,q.user_id);
 }
 function view(id,user){const q=db.prepare('SELECT * FROM deposit_quotes WHERE id=? AND user_id=?').get(id,user);if(!q)return null;const i=db.prepare('SELECT * FROM crypto_invoices WHERE quote_id=?').get(id);if(!i)return q;
  const c=db.prepare('SELECT last_ok,error,cursor FROM crypto_cursors WHERE network=? AND address=?').get(i.network,i.address);
  const r=q.request_id?db.prepare('SELECT status,coins_requested,amount_paid FROM coin_requests WHERE id=?').get(q.request_id):null;
  const review=q.request_id?db.prepare('SELECT received_amount FROM crypto_review_details WHERE request_id=?').get(q.request_id):null;
  return {...q,amount:review?.received_amount||q.amount,credit_inr:r?.coins_requested??q.credit_inr,base_inr:r?.amount_paid??q.base_inr,bonus_inr:r?r.coins_requested-r.amount_paid:q.bonus_inr,automatic:true,expires_at:i.expires_at,payment_state:r?.status==='approved'?'paid':r?.status==='pending'?'review':r?.status==='rejected'?'rejected':i.state==='waiting'&&now()>i.expires_at?'expired':i.state,monitor_ok:enabled(i.network)&&!!c?.last_ok&&!c.error&&now()-c.last_ok<120000&&!(JSON.parse(c.cursor||'{}').lag_blocks>500)&&!JSON.parse(c.cursor||'{}').fingerprint,server_time:now()};
 }
 function observe(e){return db.transaction(()=>{
  if(!['trc20','bep20'].includes(e.network)||!/^([0-9a-f]{64})$/.test(e.txid)||!Number.isSafeInteger(e.time)||!/^\d+$/.test(e.micro))throw Error('Invalid chain observation');
  const to=address(e.network,e.address),i=db.prepare('SELECT * FROM crypto_invoices WHERE network=? AND address=? AND amount_micro=?').get(e.network,to,e.micro);
  const q=i?db.prepare('SELECT * FROM deposit_quotes WHERE id=?').get(i.quote_id):null;
  const already=db.prepare('SELECT 1 FROM crypto_credits WHERE network=? AND txid=?').get(e.network,e.txid);
  let state=already?'credited':!q?'unmatched':!db.prepare('SELECT 1 FROM users WHERE id=?').get(q.user_id)?'orphan':e.time<q.created_at?'before_invoice':e.time>i.expires_at?'late':q.request_id?'review':'matched';
  db.prepare('INSERT OR IGNORE INTO crypto_observations VALUES(?,?,?,?,?,?,?)').run(e.network,e.txid,to,e.micro,e.time,q?.id||null,state);
  if(state!=='matched'){if(q&&['late','review','orphan'].includes(state))db.prepare("UPDATE crypto_invoices SET state=?,txid=? WHERE quote_id=? AND state<>'paid'").run(state,e.txid,q.id);return state;}
  const ref=`${e.network}:${e.txid}`;
  if(db.prepare("SELECT 1 FROM coin_requests WHERE lower(utr)=? AND status='approved'").get(ref))return 'legacy_credited';
  const r=db.prepare("INSERT INTO coin_requests(user_id,coins_requested,amount_paid,utr,screenshot_file,status,approved_by) VALUES(?,?,?,?,?,'approved','blockchain')").run(q.user_id,q.credit_inr,q.base_inr,ref,'');
  db.prepare('INSERT INTO crypto_credits VALUES(?,?,?,?)').run(e.network,e.txid,q.id,r.lastInsertRowid);
  if(!db.prepare('UPDATE users SET coins=coins+? WHERE id=?').run(q.credit_inr,q.user_id).changes)throw Error('Missing customer');
  db.prepare('UPDATE deposit_quotes SET request_id=? WHERE id=?').run(r.lastInsertRowid,q.id);
  db.prepare("UPDATE crypto_invoices SET state='paid',txid=? WHERE quote_id=?").run(e.txid,q.id);
  db.prepare("UPDATE crypto_observations SET state='credited' WHERE network=? AND txid=?").run(e.network,e.txid);
  db.prepare('INSERT OR IGNORE INTO crypto_notices(quote_id) VALUES(?)').run(q.id);
  return 'credited';
 })();}
 return {enabled,reserve,view,observe};
}
// Called inside the existing approval transaction, for BOTH Telegram and web admin.
function claimManual(db,row){
 const m=/^(trc20|bep20):([a-f0-9]{64})$/i.exec(row.utr||'');if(!m)return;
 schema(db);const network=m[1].toLowerCase(),txid=m[2].toLowerCase();
 if(db.prepare('SELECT 1 FROM crypto_credits WHERE network=? AND txid=?').get(network,txid))fail('This blockchain transaction was already credited.');
 if(db.prepare("SELECT 1 FROM coin_requests WHERE id<>? AND lower(utr)=? AND status='approved'").get(row.id,`${network}:${txid}`))fail('This transaction was already approved.');
 const q=db.prepare('SELECT id FROM deposit_quotes WHERE request_id=?').get(row.id);
 const seen=db.prepare('SELECT matched_quote FROM crypto_observations WHERE network=? AND txid=?').get(network,txid);
 if(seen?.matched_quote&&seen.matched_quote!==q?.id)fail('This transfer belongs to another reserved invoice.');
 db.prepare('INSERT INTO crypto_credits VALUES(?,?,?,?)').run(network,txid,q?.id||null,row.id);
 db.prepare("UPDATE crypto_observations SET state='credited',matched_quote=COALESCE(matched_quote,?) WHERE network=? AND txid=?").run(q?.id||null,network,txid);
 if(q)db.prepare("UPDATE crypto_invoices SET state='paid',txid=? WHERE quote_id=?").run(txid,q.id);
}
module.exports={schema,createCrypto,claimManual,micros,text,address};
