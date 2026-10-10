'use strict';
const crypto=require('crypto');
const reseller=require('./resellers');
const DAY=86400000;
const fail=message=>{const e=new Error(message);e.public=true;throw e;};
const num=(v,min,max)=>Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function url(value,optional=false){if(optional&&!value)return '';try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}fail('Enter a valid HTTPS URL.');}
function schema(db){db.exec(`
 CREATE TABLE IF NOT EXISTS site_products(id INTEGER PRIMARY KEY,name TEXT NOT NULL,image TEXT NOT NULL DEFAULT '',url TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,plans TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS site_stock(id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL,username TEXT NOT NULL,cipher TEXT NOT NULL,generation INTEGER NOT NULL DEFAULT 1,state TEXT NOT NULL DEFAULT 'available',created_at TEXT NOT NULL,UNIQUE(product_id,username));
 CREATE TABLE IF NOT EXISTS site_password_history(stock_id INTEGER NOT NULL,fingerprint TEXT NOT NULL,PRIMARY KEY(stock_id,fingerprint));
 CREATE TABLE IF NOT EXISTS site_leases(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,product_id INTEGER NOT NULL,stock_id INTEGER NOT NULL,generation INTEGER NOT NULL,username TEXT NOT NULL,url TEXT NOT NULL,product_name TEXT NOT NULL,expires_at INTEGER NOT NULL,created_at TEXT NOT NULL,replaced_by INTEGER);
 CREATE INDEX IF NOT EXISTS site_lease_owner ON site_leases(user_id,id);
 CREATE INDEX IF NOT EXISTS site_lease_expiry ON site_leases(expires_at);
 CREATE TABLE IF NOT EXISTS site_sales(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL,request_key TEXT NOT NULL,product_id INTEGER NOT NULL,product_name TEXT NOT NULL,kind TEXT NOT NULL,plan TEXT NOT NULL,total INTEGER NOT NULL,coupon TEXT NOT NULL,lease_ids TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(user_id,request_key));
 CREATE TABLE IF NOT EXISTS site_coupons(code TEXT PRIMARY KEY,percent INTEGER NOT NULL,max_uses INTEGER NOT NULL,expires_at INTEGER NOT NULL,enabled INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS site_notifications(id INTEGER PRIMARY KEY,lease_id INTEGER NOT NULL,expiry INTEGER NOT NULL,phase TEXT NOT NULL,audience TEXT NOT NULL,sent_at INTEGER,next_at INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,UNIQUE(lease_id,expiry,phase,audience));
`);
 db.transaction(()=>{
  if(!db.prepare('PRAGMA table_info(site_products)').all().some(c=>c.name==='sort_rank')){
   db.exec('ALTER TABLE site_products ADD COLUMN sort_rank INTEGER NOT NULL DEFAULT 0');
   const update=db.prepare('UPDATE site_products SET sort_rank=? WHERE id=?');
   db.prepare('SELECT id FROM site_products ORDER BY id DESC').all().forEach((p,i)=>update.run(i,p.id));
  }
 })();
}
function createStore(db,key,{now=()=>Date.now(),notify=async()=>null}={}){
 reseller.schema(db);
 schema(db);const stockAlerts=require('./stock-alerts').createStockAlerts(db,{now});if(!key||Buffer.byteLength(key)!==32)throw Error('Site credential key must be 32 bytes.');
 function seal(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([c.update(value,'utf8'),c.final()]);return Buffer.concat([iv,c.getAuthTag(),data]).toString('base64');}
 function open(value){const b=Buffer.from(value,'base64'),d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8');}
 const fingerprint=password=>crypto.createHmac('sha256',key).update(password).digest('hex');
 const getProduct=id=>db.prepare('SELECT * FROM site_products WHERE id=?').get(id);
 function expire(){db.prepare("UPDATE site_stock SET state='expired' WHERE state='assigned' AND NOT EXISTS(SELECT 1 FROM site_leases l WHERE l.stock_id=site_stock.id AND l.generation=site_stock.generation AND l.expires_at>?)").run(now());}
 function products(admin=false){expire();return db.prepare(`SELECT * FROM site_products ${admin?'':'WHERE enabled=1'} ORDER BY sort_rank ASC,id DESC`).all().map(p=>{
 const counts=db.prepare("SELECT count(*) total,sum(state='available') available,sum(state='assigned') active,sum(state='expired') expired FROM site_stock WHERE product_id=? AND state<>'archived'").get(p.id);
 const expiring=db.prepare('SELECT count(*) n FROM site_leases WHERE product_id=? AND expires_at>? AND expires_at<=? AND replaced_by IS NULL').get(p.id,now(),now()+DAY).n;
 const sold=db.prepare('SELECT count(*) n FROM site_leases WHERE product_id=?').get(p.id).n;
 const base={id:p.id,name:p.name,image:p.image,enabled:!!p.enabled,plans:JSON.parse(p.plans),stock:counts.available||0};
 return admin?{...base,url:p.url,counts:{...counts,expiring,sold}}:base;
 });}
 function saveProduct(body){const name=String(body.name||'').trim();if(!name||name.length>100)fail('Name required (maximum 100 characters).');
 const plans=body.plans;if(!Array.isArray(plans)||!plans.length||plans.length>12)fail('Add 1–12 plans.');const keys=new Set();
 const normalized=plans.map(p=>{if(!/^[a-zA-Z0-9_-]{1,32}$/.test(p.key)||keys.has(p.key)||!num(p.days,1,3650)||!num(p.price,1,1000000)||!num(p.original_price||0,0,1000000))fail('Each plan needs a unique key, valid days and whole ₹ price.');keys.add(p.key);return {key:p.key,days:Number(p.days),price:Number(p.price),original_price:Number(p.original_price||0)};});
 const values=[name,(/^\/api\/files\/[a-zA-Z0-9_-]+$/.test(body.image||'')?body.image:url(body.image,true)),url(body.url),body.enabled?1:0,JSON.stringify(normalized)];
 if(body.id){if(!getProduct(body.id))fail('Website not found.');db.prepare('UPDATE site_products SET name=?,image=?,url=?,enabled=?,plans=? WHERE id=?').run(...values,body.id);return Number(body.id);}
 return Number(db.prepare('INSERT INTO site_products(name,image,url,enabled,plans,sort_rank) VALUES(?,?,?,?,?,(SELECT coalesce(max(sort_rank),-1)+1 FROM site_products))').run(...values).lastInsertRowid);}
 function moveProduct(id,direction){
  if(!['up','down'].includes(direction))fail('Choose up or down.');
  return db.transaction(()=>{
   const rows=db.prepare('SELECT id FROM site_products ORDER BY sort_rank ASC,id DESC').all();
   const at=rows.findIndex(r=>r.id===Number(id));if(at<0)fail('Website not found.');
   const next=at+(direction==='up'?-1:1);
   if(next>=0&&next<rows.length)[rows[at],rows[next]]=[rows[next],rows[at]];
   const update=db.prepare('UPDATE site_products SET sort_rank=? WHERE id=?');rows.forEach((r,i)=>update.run(i,r.id));
   return {success:true};
  })();
 }
 function addStock(productId,body,announce=true){if(!getProduct(productId))fail('Website not found.');const username=String(body.username||'').trim(),password=String(body.password||'');if(!username||username.length>120||password.length<6||password.length>256)fail('Account ID required; password must be 6–256 characters.');
 if(db.prepare('SELECT 1 FROM site_stock WHERE product_id=? AND username=?').get(productId,username))fail('Account already exists. Use restock for expired accounts.');
 db.transaction(()=>{const r=db.prepare('INSERT INTO site_stock(product_id,username,cipher,created_at) VALUES(?,?,?,?)').run(productId,username,seal(password),new Date(now()).toISOString());db.prepare('INSERT INTO site_password_history VALUES(?,?)').run(r.lastInsertRowid,fingerprint(password));if(announce)stockAlerts.enqueue(productId,1);})();}
 function addBulkStock(productId,text){
  if(typeof text!=='string'||text.length>100000)fail('Paste a list under 100,000 characters.');
  const rows=text.split(/\r?\n/).map((text,i)=>({text:text.trim(),line:i+1})).filter(r=>r.text);
  if(!rows.length||rows.length>200)fail('Send 1–200 accounts per batch.');
  const seen=new Set();const parsed=rows.map(r=>{
   const line=r.text.replace(/^\d+[.)]\s+/, '');
   const m=line.match(/^(\S+?)\s*[—–]\s*(.+)$/)||line.match(/^(\S+)\s+-\s+(.+)$/);
   if(!m)fail(`Line ${r.line}: use account ID — password.`);
   const username=m[1].trim(),password=m[2].trim();
   if(!username||username.length>120||password.length<6||password.length>256)fail(`Line ${r.line}: invalid account ID or password length (6–256).`);
   if(seen.has(username))fail(`Line ${r.line}: duplicate account in this batch.`);seen.add(username);
   return {username,password,line:r.line};
  });
  return db.transaction(()=>{
   if(!getProduct(productId))fail('Website not found.');
   for(const r of parsed)if(db.prepare('SELECT 1 FROM site_stock WHERE product_id=? AND username=?').get(productId,r.username))fail(`Line ${r.line}: account already exists. Use restock for expired accounts. Nothing was added.`);
   for(const r of parsed)addStock(productId,r,false);
   stockAlerts.enqueue(productId,parsed.length);
   return {added:parsed.length,available:db.prepare("SELECT count(*) n FROM site_stock WHERE product_id=? AND state='available'").get(productId).n};
  })();
 }
 function removeStock(productId,body){return db.transaction(()=>{
  const p=getProduct(productId);if(!p||body.confirm!==p.name)fail('Type the exact website name to confirm stock removal.');expire();
  const result=db.prepare("UPDATE site_stock SET state='archived' WHERE product_id=? AND state IN ('available','expired') AND NOT EXISTS(SELECT 1 FROM site_leases l WHERE l.stock_id=site_stock.id AND l.generation=site_stock.generation AND l.expires_at>?)").run(productId,now());
  return {removed:result.changes,protected:db.prepare("SELECT count(*) n FROM site_stock WHERE product_id=? AND state='assigned'").get(productId).n};
 })();}
 function restock(id,body){return db.transaction(()=>{expire();const s=db.prepare('SELECT * FROM site_stock WHERE id=?').get(id);if(!s||s.state!=='expired')fail('Only expired accounts can be restocked.');if(body.confirmed!==true)fail('Confirm password was changed on the actual website.');const password=String(body.password||'');if(password.length<6||password.length>256||db.prepare('SELECT 1 FROM site_password_history WHERE stock_id=? AND fingerprint=?').get(id,fingerprint(password)))fail('Enter a new password (6–256 characters). Never reuse a previous password.');db.prepare('INSERT INTO site_password_history VALUES(?,?)').run(id,fingerprint(password));db.prepare("UPDATE site_stock SET cipher=?,generation=generation+1,state='available' WHERE id=?").run(seal(password),id);stockAlerts.enqueue(s.product_id,1);})();}
 function quote(userId,body){const p=getProduct(Number(body.product_id));if(!p||!p.enabled)fail('Website is unavailable.');const plan=JSON.parse(p.plans).find(x=>x.key===body.plan_key);if(!plan)fail('Select a valid plan.');
 let parent=null;if(body.renew_id){parent=db.prepare('SELECT * FROM site_leases WHERE id=? AND user_id=? AND product_id=?').get(body.renew_id,userId,p.id);if(!parent||parent.replaced_by)fail('Account is not available for renewal. Open its latest replacement account.');}
 const quantity=parent?1:Number(body.quantity??1);if(!num(quantity,1,10))fail('Quantity must be 1–10.');
 const same=!!parent&&parent.expires_at>now();const available=db.prepare("SELECT count(*) n FROM site_stock WHERE product_id=? AND state='available' AND id<>?").get(p.id,parent?.stock_id||-1).n;
 if(!same&&available<quantity)fail('Not enough accounts in stock. No payment has been taken.');
 const coupon=String(body.coupon||'').trim().toUpperCase();const reseller_price=reseller.pricing(db,userId,'site',plan.price*quantity,coupon);let discount=reseller_price.discount;if(coupon){const c=db.prepare('SELECT * FROM site_coupons WHERE code=?').get(coupon);const used=db.prepare('SELECT count(*) n FROM site_sales WHERE coupon=?').get(coupon).n;if(!c||!c.enabled||c.expires_at<=now()||used>=c.max_uses)fail('Coupon is invalid, expired or fully used.');discount=Math.floor(plan.price*quantity*c.percent/100);}
 return {product:p,plan,parent,quantity,same_account:same,subtotal:plan.price*quantity,discount,total:Math.round((plan.price*quantity-discount)*100)/100,coupon,reseller_price};}
 function purchase(userId,body){if(!/^[a-zA-Z0-9_-]{16,100}$/.test(body.request_key||''))fail('Invalid purchase request.');return db.transaction(()=>{
 const previous=db.prepare('SELECT * FROM site_sales WHERE user_id=? AND request_key=?').get(userId,body.request_key);if(previous)return {id:previous.id,lease_ids:JSON.parse(previous.lease_ids),total:previous.total};
 expire();const q=quote(userId,body);if(Number(body.expected_total)!==q.total||typeof body.expected_same_account!=='boolean'||body.expected_same_account!==q.same_account)fail('Price or account availability changed. Review checkout again.');
 const debit=db.prepare('UPDATE users SET coins=ROUND(coins-?,2) WHERE id=? AND coins>=?').run(q.total,userId,q.total);if(!debit.changes)fail('Not enough wallet balance. Add funds first.');
 const ids=[],date=new Date(now()).toISOString();if(q.same_account){const expiry=q.parent.expires_at+q.plan.days*DAY;db.prepare('UPDATE site_leases SET expires_at=? WHERE id=?').run(expiry,q.parent.id);ids.push(q.parent.id);}
 else{const stocks=db.prepare("SELECT * FROM site_stock WHERE product_id=? AND state='available' AND id<>? ORDER BY id LIMIT ?").all(q.product.id,q.parent?.stock_id||-1,q.quantity);
 if(stocks.length!==q.quantity)fail('Stock changed. Please try again.');for(const s of stocks){const id=Number(db.prepare('INSERT INTO site_leases(user_id,product_id,stock_id,generation,username,url,product_name,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(userId,q.product.id,s.id,s.generation,s.username,q.product.url,q.product.name,now()+q.plan.days*DAY,date).lastInsertRowid);db.prepare("UPDATE site_stock SET state='assigned' WHERE id=?").run(s.id);ids.push(id);}if(q.parent)db.prepare('UPDATE site_leases SET replaced_by=? WHERE id=?').run(ids[0],q.parent.id);}
 const sale=db.prepare('INSERT INTO site_sales(user_id,request_key,product_id,product_name,kind,plan,total,coupon,lease_ids,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(userId,body.request_key,q.product.id,q.product.name,q.parent?'renew':'purchase',JSON.stringify(q.plan),q.total,q.coupon,JSON.stringify(ids),date);
 reseller.record(db,userId,'site',sale.lastInsertRowid,`${q.product.name} · ${q.plan.days} days × ${q.quantity}${q.parent?' · renewal':''}`,q.reseller_price);
 for(const id of ids){const l=db.prepare('SELECT expires_at FROM site_leases WHERE id=?').get(id);enqueue(id,l.expires_at,q.parent?'renewal':'purchase','user');if(q.parent)enqueue(id,l.expires_at,'renewal','admin');}
 return {id:Number(sale.lastInsertRowid),lease_ids:ids,total:q.total};})();}
 function accounts(userId){expire();return db.prepare('SELECT l.*,s.cipher,s.generation current_generation,s.state FROM site_leases l JOIN site_stock s ON s.id=l.stock_id WHERE l.user_id=? ORDER BY l.id DESC').all(userId).map(({cipher,current_generation,state,...l})=>{const active=l.expires_at>now()&&l.generation===current_generation&&state==='assigned';return {...l,status:active?'active':'expired',password:active?open(cipher):null};});}
 function inventory(productId){expire();return db.prepare(`SELECT s.id,s.username,s.generation,s.state,s.created_at,l.id lease_id,l.user_id,l.expires_at FROM site_stock s LEFT JOIN site_leases l ON l.stock_id=s.id AND l.generation=s.generation WHERE s.product_id=? AND s.state<>'archived' ORDER BY s.id DESC`).all(productId);}
 function enqueue(id,expiry,phase,audience){db.prepare('INSERT OR IGNORE INTO site_notifications(lease_id,expiry,phase,audience) VALUES(?,?,?,?)').run(id,expiry,phase,audience);}
 let busy=false;
 async function tick(){if(busy)return;busy=true;try{expire();const leases=db.prepare('SELECT * FROM site_leases WHERE expires_at<=?').all(now()+DAY);
 for(const l of leases){const phase=l.expires_at<=now()?'expired':'reminder';if(l.replaced_by&&phase==='reminder')continue;for(const audience of ['admin','user'])enqueue(l.id,l.expires_at,phase,audience);}
 const jobs=db.prepare('SELECT * FROM site_notifications WHERE sent_at IS NULL AND next_at<=? ORDER BY next_at,id LIMIT 50').all(now());
 for(const j of jobs){const l=db.prepare('SELECT * FROM site_leases WHERE id=?').get(j.lease_id);if(!l||l.expires_at!==j.expiry||(j.phase==='reminder'&&(l.expires_at<=now()||l.replaced_by))||(['purchase','renewal'].includes(j.phase)&&l.expires_at<=now())){db.prepare('UPDATE site_notifications SET sent_at=? WHERE id=?').run(now(),j.id);continue;}
 const admin=j.audience==='admin';
 const current=db.prepare('SELECT generation FROM site_stock WHERE id=?').get(l.stock_id);
 // Never tell the admin to disable credentials already rotated and assigned to someone else.
 if(j.phase==='expired'&&((admin&&current?.generation!==l.generation)||(!admin&&l.replaced_by))){db.prepare('UPDATE site_notifications SET sent_at=? WHERE id=?').run(now(),j.id);continue;}
 const chat=admin?(db.prepare("SELECT value FROM settings WHERE key='telegram_admin_id'").get()?.value||process.env.TELEGRAM_ADMIN_CHAT_ID):db.prepare('SELECT telegram_id FROM users WHERE id=?').get(l.user_id)?.telegram_id;
 const siteUrl=db.prepare("SELECT value FROM settings WHERE key='site_url'").get()?.value||'';
 const {text,replyMarkup}=require('./panel-links').siteNotice(l,j.phase,admin,siteUrl||process.env.SITE_URL||process.env.BASE_URL);
 let sent=null;try{if(chat)sent=await notify(chat,text,replyMarkup);}catch{}

 db.prepare('UPDATE site_notifications SET sent_at=?,next_at=?,attempts=attempts+1 WHERE id=?').run(sent?now():null,now()+300000,j.id);
 }
 }finally{busy=false;}}
 function coupon(body){const code=String(body.code||'').trim().toUpperCase(),expiry=Date.parse(body.expires_at);if(!/^[A-Z0-9_-]{3,30}$/.test(code)||!num(body.percent,1,100)||!num(body.max_uses,1,100000)||!Number.isFinite(expiry))fail('Enter valid coupon, percent, limit and expiry.');db.prepare('INSERT INTO site_coupons VALUES(?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET percent=excluded.percent,max_uses=excluded.max_uses,expires_at=excluded.expires_at,enabled=excluded.enabled').run(code,Number(body.percent),Number(body.max_uses),expiry,body.enabled?1:0);}
 for(const existing of db.prepare('SELECT id,cipher FROM site_stock').all()){const password=open(existing.cipher);db.prepare('INSERT OR IGNORE INTO site_password_history VALUES(?,?)').run(existing.id,fingerprint(password));} // Fail closed if the wrong key was restored.
 return {broadcastStock:stockAlerts.tick,products,saveProduct,moveProduct,addStock,addBulkStock,removeStock,restock,quote,purchase,accounts,inventory,tick,coupon};
}
module.exports={createStore,schema,DAY};
