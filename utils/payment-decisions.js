'use strict';
function isPaymentAdmin(sender,configured){return /^\d+$/.test(String(sender||''))&&String(configured||'').split(',').map(s=>s.trim()).filter(s=>/^\d+$/.test(s)).includes(String(sender));}
function decidePayment(db,id,action,actor){
 if(!Number.isSafeInteger(Number(id))||Number(id)<1||!['approve','reject'].includes(action))return {error:'Invalid request'};
 return db.transaction(()=>{
  const row=db.prepare('SELECT * FROM coin_requests WHERE id=?').get(Number(id));
  if(!row)return {error:'Not found'};if(row.status!=='pending')return {error:'Already processed'};
  if(action==='approve'&&(!Number.isSafeInteger(Number(row.coins_requested))||Number(row.coins_requested)<1))return {error:'Invalid amount'};
  if(action==='approve'){try{db.transaction(()=>require('./crypto-payments').claimManual(db,row))();}catch(e){return {error:e.public?e.message:'Could not validate transaction credit.'};}}
  const status=action==='approve'?'approved':'rejected';
  const changed=db.prepare("UPDATE coin_requests SET status=?,approved_by=? WHERE id=? AND status='pending'").run(status,actor,row.id);
  if(!changed.changes)return {error:'Already processed'};
  if(action==='approve'&&!db.prepare('UPDATE users SET coins=coins+? WHERE id=?').run(row.coins_requested,row.user_id).changes)throw Error('Payment recipient missing');
  return {row,status};
 })();
}
module.exports={isPaymentAdmin,decidePayment};
