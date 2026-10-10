import React from 'react';
import {CheckCircle2,Clock3,AlertCircle} from 'lucide-react';
import {Sheet} from './ui';
export default function PurchaseResult({receipt,onClose}){
 if(!receipt)return null;
 const pending=receipt.pending,failed=receipt.failed;
 return <Sheet open title={failed?'Order unsuccessful':pending?'Order received':'Purchase complete'} subtitle={`Order #${receipt.id}`} onClose={onClose}>
 <div className="purchase-result"><span className={`purchase-result-icon ${failed?'failed':pending?'pending':''}`}>{failed?<AlertCircle size={36}/>:pending?<Clock3 size={36}/>:<CheckCircle2 size={36}/>}</span><h2>{failed?'Please review your order':pending?'Your bot setup is in progress':'You’re all set!'}</h2><p>{pending?'Payment received. We’ll show Active only after the bot runtime confirms deployment.':receipt.message||'Your website accounts are ready. Open My accounts for login details and expiry.'}</p><div className="purchase-receipt"><span>Wallet payment</span><b>₹{Number(receipt.total||0).toLocaleString('en-IN')}</b></div>{receipt.count&&<div className="purchase-receipt"><span>Accounts assigned</span><b>{receipt.count}</b></div>}<button autoFocus className="btn btn-primary" onClick={onClose}>{pending?'View order status':receipt.bot?'View my bots':'View my accounts'}</button></div></Sheet>;
}
