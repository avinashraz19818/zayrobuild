import React, { useEffect, useRef, useState } from 'react';
import { QrCode, Upload, Clock, ArrowUpRight, Landmark, ReceiptText, ClipboardPaste, X, AlertCircle } from 'lucide-react';
import { Wallet, Copy, Check, ShieldCheck, ArrowLeft } from '../components/AnimatedIcon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/Toast';
import { EmptyState, Loader, Notice, SectionHead, Sheet, StatusPill } from '../components/ui';
import { wallet as walletApi, copyText, fmtDate, api } from '../lib/api';
import UsdtIcon from '../components/UsdtIcon';
import TelegramGate from '../components/TelegramGate';

const METHODS = [{id:'upi',name:'UPI',sub:'Instant transfer',icon:Landmark},{id:'trc20',name:'USDT',sub:'TRC20 · Tron'},{id:'bep20',name:'USDT',sub:'BEP20 · BNB'}];
const label = id => id === 'upi' ? 'UPI' : `USDT ${id.toUpperCase()}`;
const rupees = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function WalletView({ setTab }) {
 const {user,refreshUser}=useAuth(), {payment,refreshPayment,config}=useStore(), {addToast}=useToast();
 const [method,setMethod]=useState('upi'),[amount,setAmount]=useState('100');
 const [quote,setQuote]=useState(null),[open,setOpen]=useState(false),[preparing,setPreparing]=useState(false),[qr,setQr]=useState(null),[qrError,setQrError]=useState(false);
 const [filePreview,setFilePreview]=useState('');
 const [showProof,setShowProof]=useState(false),[receivedAmount,setReceivedAmount]=useState(''),[paymentNote,setPaymentNote]=useState(''),[clock,setClock]=useState(Date.now()),[statusError,setStatusError]=useState(false);
 const paidNotice=useRef(null),serverOffset=useRef(0);
 const fileInput=useRef(null);
 const [utr,setUtr]=useState(''),[file,setFile]=useState(null),[submitting,setSubmitting]=useState(false),[history,setHistory]=useState([]),[loading,setLoading]=useState(true),[historyError,setHistoryError]=useState(false);
 const sheetBody=useRef(null),continueButton=useRef(null),prepareLock=useRef(false),submitLock=useRef(false),startedPayment=useRef(false);
 const loadHistory=async()=>{if(!user){setLoading(false);return;}try{setHistoryError(false);const data=await api.get('/api/me/coin-requests');setHistory(Array.isArray(data)?data:[]);}catch{setHistoryError(true);}finally{setLoading(false);}};
 useEffect(()=>{refreshPayment();loadHistory();let current=true;if(user)api.get('/api/deposits/latest').then(q=>{if(current&&q?.id&&!startedPayment.current)setQuote(q);}).catch(()=>{});return()=>{current=false;}; /* eslint-disable-next-line */},[user?.id]);
 useEffect(()=>{if(!quote)return;let cancelled=false;setQrError(false);import('qrcode').then(({default:QRCode})=>QRCode.toDataURL(quote.payload,{width:320,margin:4,errorCorrectionLevel:'M',color:{dark:'#111122',light:'#ffffff'}})).then(url=>{if(!cancelled)setQr({id:quote.id,url});}).catch(()=>{if(!cancelled)setQrError(true);});return()=>{cancelled=true;};},[quote?.id,quote?.payload]);
 useEffect(()=>{if(!open)return;const sheet=sheetBody.current?.closest('[role="dialog"]');sheet?.setAttribute('aria-label','Payment details');sheetBody.current?.focus({preventScroll:true});const trap=e=>{if(e.key!=='Tab'||!sheet)return;const nodes=[...sheet.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===sheetBody.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);continueButton.current?.focus();};},[open]);
 useEffect(()=>{if(!file){setFilePreview('');return;}const url=URL.createObjectURL(file);setFilePreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 useEffect(()=>{
  if(!quote?.automatic)return;let cancelled=false,timer;const controller=new AbortController();
  const poll=async()=>{try{const next=await api.get(`/api/deposits/${encodeURIComponent(quote.id)}/status`,{signal:controller.signal});if(cancelled)return;serverOffset.current=next.server_time-Date.now();setQuote(next);setStatusError(false);
   if(next.payment_state==='paid'&&paidNotice.current!==next.id){paidNotice.current=next.id;addToast('Payment received · Wallet credited','success');refreshUser();loadHistory();}
   if(['paid','rejected'].includes(next.payment_state))return;
  }catch{if(!cancelled)setStatusError(true);}if(!cancelled)timer=setTimeout(poll,10000);};poll();
  const tick=setInterval(()=>setClock(Date.now()),1000);return()=>{cancelled=true;controller.abort();clearTimeout(timer);clearInterval(tick);};
 },[quote?.id,quote?.automatic]);
 const seconds=quote?.expires_at?Math.max(0,Math.ceil((quote.expires_at-clock-serverOffset.current)/1000)):0;
 const paymentDone=['paid','review','rejected'].includes(quote?.payment_state);
 const chooseFile=e=>{const next=e.target.files?.[0];if(!next)return;if(!['image/png','image/jpeg','image/webp'].includes(next.type)||next.size>5*1024*1024){e.target.value='';setFile(null);addToast('Choose a JPG, PNG or WebP image up to 5 MB.','error');return;}setFile(next);};
 const pasteReference=async()=>{try{const text=(await navigator.clipboard.readText()).trim();if(!(quote?.method==='upi'?/^\d{12}$/:/^(0x)?[0-9a-f]{64}$/i).test(text)){addToast('Copy the complete payment reference, then paste again.','error');return;}setUtr(text);addToast('Payment reference pasted','success');}catch{addToast('Clipboard unavailable. Tap the reference field and paste manually.','info');}};
 const isCrypto=method!=='upi',rate=Number(payment?.usdt_inr_rate||0),bonusPercent=Number(payment?.usdt_bonus_percent||0);
 const address=payment?.[isCrypto?`usdt_${method}_address`:'upi_id'];
 const configured=!!address&&(!isCrypto||(rate>0&&rate<=10000));
 const valid=/^\d+(?:\.\d{1,2})?$/.test(amount)&&Number(amount)>=(isCrypto?10:1)&&Number(amount)<=(isCrypto?10000:1000000)&&(isCrypto||Number.isInteger(Number(amount)));
 const base=valid?Math.floor(Math.round(Number(amount)*100)*Math.round((isCrypto?rate:1)*100)/10000):0,bonus=isCrypto?Math.floor(base*bonusPercent/100):0;
 const copy=async(value,name)=>addToast(await copyText(String(value))?`${name} copied`:'Could not copy. Select and copy the text manually.', 'info');
 const prepare=async()=>{if(prepareLock.current)return;prepareLock.current=true;startedPayment.current=true;setPreparing(true);try{const next=await walletApi.quote(method,amount);setQuote(next);serverOffset.current=(next.server_time||Date.now())-Date.now();setClock(Date.now());setShowProof(false);setReceivedAmount('');setPaymentNote('');setUtr('');setFile(null);setOpen(true);}catch(e){addToast(e.message||'Could not prepare payment','error');}finally{prepareLock.current=false;setPreparing(false);}};
 const submit=async e=>{e.preventDefault();if(submitLock.current)return;if(!file){addToast('Upload your payment screenshot','error');return;}submitLock.current=true;setSubmitting(true);try{const submitted=await walletApi.request({quote_id:quote.id,utr:utr.trim(),screenshot:file,...(quote.method!=='upi'?{received_amount:receivedAmount||quote.amount,note:paymentNote}:{})});setOpen(false);setQuote(null);setUtr('');setFile(null);addToast(submitted.status==='approved'?'Payment received · Wallet updated':'Payment submitted · Pending','success');await Promise.all([refreshUser(),loadHistory()]);}catch(err){addToast(err.message||'Could not submit proof','error');}finally{submitLock.current=false;setSubmitting(false);}};
 if(!user)return <TelegramGate botLink={config?.bot_link}/>;
 return <div className="deposit-page">
  <div className="deposit-heading"><div><span className="deposit-eyebrow">YOUR WALLET, YOUR WAY</span><h1>Add funds</h1><p>A little top-up. More possibilities.</p></div><button className="deposit-back" aria-label="Back to account" onClick={()=>setTab?.('account')}><ArrowLeft size={19}/></button></div>
  <section className="deposit-balance"><span className="deposit-balance-symbol"><Wallet size={29}/></span><div><span>Current balance</span><strong>{rupees(user.coins)}</strong></div><span className="deposit-balance-tag">INR WALLET</span></section>
  <section className="deposit-section"><div className="deposit-step"><span>01</span><h2>Choose your payment route</h2></div><div className="deposit-methods" role="group" aria-label="Payment method">{METHODS.map(m=><button key={m.id} aria-pressed={method===m.id} className={method===m.id?'selected':''} onClick={()=>{setMethod(m.id);setAmount(m.id==='upi'?'100':'10');}}>{m.id==='upi'?<Landmark size={26}/>:<UsdtIcon network={m.id}/>}<strong>{m.name}</strong><small>{m.sub}</small>{method===m.id&&<Check size={12} className="deposit-selected"/>}</button>)}</div>
   <div className="deposit-network-note"><ShieldCheck size={16}/><span>{isCrypto?`Use ${method.toUpperCase()} only · Minimum 10 USDT`:'Amount-linked QR · Pay from a compatible UPI app'}</span></div>
   {!configured&&<Notice tone="warn">{label(method)} is not available yet. Please choose another method or contact support.</Notice>}
   {isCrypto&&configured&&<div className="deposit-rate"><span>Store rate <b>1 USDT = {rupees(rate)}</b></span>{bonusPercent>0&&<span className="deposit-bonus">+{bonusPercent}% bonus</span>}</div>}
  </section>
  <section className="deposit-section"><div className="deposit-step"><span>02</span><h2>How much would you like to add?</h2></div><div className="deposit-amounts">{(isCrypto?[10,25,50,100,250,500]:[100,300,500,1000,2000,5000]).map(n=><button key={n} aria-pressed={Number(amount)===n} onClick={()=>setAmount(String(n))} className={Number(amount)===n?'selected':''}>{isCrypto?<><small><UsdtIcon size={13}/> USDT</small> {n}</>:rupees(n)}</button>)}</div>
   <label className="deposit-custom"><span>{isCrypto?'USDT':'₹'}</span><input aria-label="Custom deposit amount" inputMode={isCrypto?'decimal':'numeric'} type="text" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter your amount" maxLength={12}/><small>{isCrypto?'MIN 10':'INR'}</small></label>
   {!valid&&<p className="deposit-validation" role="status">{isCrypto?'Enter 10–10,000 USDT, with up to 2 decimal places.':'Enter a whole-rupee amount from ₹1 to ₹10,00,000.'}</p>}
   <div className="deposit-summary"><div><span>You send</span><b>{valid?(isCrypto?`${Number(amount).toFixed(2)} USDT`:rupees(amount)):'—'}</b></div>{isCrypto&&configured&&<><div><span>INR equivalent</span><b>{rupees(base)}</b></div>{bonusPercent>0&&<div><span>Bonus ({bonusPercent}%)</span><b>+{rupees(bonus)}</b></div>}</>}<div className="deposit-total"><span>Top-up value</span><strong>{configured&&valid?rupees(base+bonus):'—'}</strong></div></div>
   <button ref={continueButton} className="btn btn-primary btn-block deposit-continue" disabled={!configured||!valid||preparing} onClick={prepare}>{preparing?'Preparing payment…':`Continue with ${label(method)}`}<ArrowUpRight size={21}/></button>
  </section>
  {quote&&!open&&<div className="deposit-resume"><div><b>Payment details saved</b><span>{quote.method==='upi'?rupees(quote.amount):`${quote.amount} USDT`} · {label(quote.method)} · {quote.payment_state==='paid'?'Paid':quote.payment_state==='review'?'Pending review':'Payment details'}</span></div><button className="btn btn-soft btn-sm" onClick={()=>setOpen(true)}>Resume</button></div>}
  <section className="deposit-section"><SectionHead icon={Clock} title="Deposit history" action={<button className="btn btn-ghost btn-xs" onClick={()=>{refreshUser();loadHistory();}}>Refresh</button>}/>{loading?<Loader label="Loading deposits…"/>:historyError?<Notice tone="warn">History could not load. Please refresh before submitting again.</Notice>:!history.length?<EmptyState icon={Clock} title="Your next chapter starts here" text="Your top-ups and payment status will appear here."/>:<div className="stack gap-8">{history.map(row=><div className="row-item" key={row.id}><span className="row-ico">{row.status==='approved'?<Check size={17}/>:row.status==='rejected'?<AlertCircle size={17}/>:<Clock size={17}/>}</span><span className="row-main"><b className="row-title">{rupees(row.coins_requested)} wallet credit</b><span className="row-sub">{label(row.payment_method||'upi')} {row.payment_method&&row.payment_method!=='upi'?`· ${row.payment_amount} USDT`:''} · {fmtDate(row.created_at)}</span></span><StatusPill status={row.status==='approved'?'done':row.status==='rejected'?'failed':'pending'}/></div>)}</div>}</section>
  <Sheet open={open&&!!quote} title="Complete payment" subtitle="Scan. Pay. Add your receipt." icon={Wallet} onClose={()=>{if(!submitting){setOpen(false);setFile(null);}}} className="deposit-sheet" overlayClassName="deposit-overlay">
   {quote&&<div ref={sheetBody} tabIndex={-1} className="deposit-sheet-content">
    <div className="payment-brand">{quote.method==='upi'?<span className="upi-pay-mark"><Landmark size={19}/></span>:<UsdtIcon network={quote.method} size={30}/>}<b>{label(quote.method)}</b><span className="payment-brand-tag">{quote.method==='upi'?'AMOUNT-LINKED QR':'NETWORK-SPECIFIC'}</span></div>
    <div className="deposit-pay-amount"><span>{quote.payment_state==='paid'?'PAYMENT RECEIVED':'PAYMENT AMOUNT'}</span><strong>{quote.method==='upi'?rupees(quote.amount):`${quote.amount} USDT`}</strong><p>Top-up value <b>{rupees(quote.credit_inr)}</b>{quote.bonus_inr>0?` · includes ₹${quote.bonus_inr} bonus`:''}</p>{quote.method!=='upi'&&!paymentDone&&<button type="button" className="btn btn-soft btn-xs" onClick={()=>copy(quote.amount,'Amount')}><Copy size={13}/> Copy amount</button>}</div>
    {(!quote.automatic||!paymentDone)&&<>
    {quote.automatic&&<p className="deposit-exact-hint">Send exactly <b>{quote.amount} USDT</b>, including all decimal digits. The small reference fraction identifies your payment; your top-up value is shown above.</p>}
    {quote.method!=='upi'&&<div className="deposit-chain-warning">Only USDT on <b>{quote.method.toUpperCase()}</b>. Other networks/tokens may cause loss. Account for sending fees so the recipient receives {quote.amount} USDT.</div>}

    <div className="deposit-qr">{qr?.id===quote.id?<img src={qr.url} alt={quote.method==='upi'?`UPI QR for ₹${quote.amount}`:`${quote.method.toUpperCase()} receiving address QR`}/>:qrError?<p>QR unavailable. Copy the payment details above.</p>:<Loader label="Creating your QR…"/>}</div>
    <p className="deposit-qr-caption">{quote.method==='upi'?'Amount included · Check payee before paying.':'Address-only QR. Select the correct network and enter the exact amount in your wallet.'}</p>
    <div className="deposit-destination"><small>{quote.method==='upi'?'UPI ID':'RECEIVING ADDRESS'}</small><code>{quote.address}</code><button type="button" className="btn btn-soft btn-xs" onClick={()=>copy(quote.address,quote.method==='upi'?'UPI ID':'Address')}><Copy size={14}/> {quote.method==='upi'?'Copy UPI ID':'Copy address'}</button></div>
    </>}
    {quote.automatic&&<section className={`crypto-payment-status ${quote.payment_state==='paid'?'paid':''}`} aria-live="polite">
     <div>{quote.payment_state==='paid'?<Check size={23}/>:<Clock size={23}/>}<span><b>{quote.payment_state==='paid'?'Payment received':quote.payment_state==='review'?'Proof submitted · Pending':quote.payment_state==='rejected'?'Request declined':seconds===0?'Payment window ended':'Waiting for confirmed payment'}</b><small>{quote.payment_state==='paid'?`${rupees(quote.credit_inr)} added to your wallet`:paymentDone?'Check your deposit history for updates':seconds>0?`Time left ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'Already paid? Confirmations can still arrive. Late or different amount? Submit proof below.'}</small></span></div>
     {!paymentDone&&(statusError||!quote.monitor_ok)&&<p>Payment checking is delayed. Do not pay again. Your invoice is saved.</p>}
     {!paymentDone&&<p>You can close this window. Server-side payment checking continues.</p>}
    </section>}
    {quote.automatic&&!paymentDone&&<button type="button" className="crypto-proof-toggle" onClick={()=>setShowProof(v=>!v)}>{showProof?'Back to payment status':'Late or different amount? Submit proof'}</button>}
    {(!quote.automatic||(showProof&&!paymentDone))&&<form onSubmit={submit} className="deposit-proof">
     <div className="payment-proof-heading"><span className="payment-proof-icon"><ReceiptText size={21}/></span><div><span className="deposit-eyebrow">ONE LAST STEP</span><h2>Add payment details</h2></div></div>
     {quote.method!=='upi'&&<label className="field"><span className="label">Actual USDT amount sent</span><input className="input" aria-label="Actual USDT amount sent" required={!!quote.automatic} inputMode="decimal" value={receivedAmount} onChange={e=>setReceivedAmount(e.target.value)} placeholder={quote.amount} pattern="[0-9]+([.][0-9]{1,6})?" disabled={submitting}/><small>Enter what the receiving address actually received, after sending fees.</small></label>}
     <div className="field payment-reference-field">
      <label className="label" htmlFor="payment-reference">{quote.method==='upi'?'12-digit UTR':'Transaction hash (TXID)'}</label>
      <div className="payment-reference-input"><input id="payment-reference" required value={utr} onChange={e=>setUtr(e.target.value)} inputMode={quote.method==='upi'?'numeric':'text'} pattern={quote.method==='upi'?'[0-9]{12}':'(0[xX])?[0-9a-fA-F]{64}'} maxLength={quote.method==='upi'?12:66} placeholder={quote.method==='upi'?'Enter UTR number':'Enter transaction hash'} disabled={submitting}/><button type="button" onClick={pasteReference} disabled={submitting} aria-label="Paste payment reference"><ClipboardPaste size={14}/> Paste</button></div>
      <div className="payment-reference-hint"><span>{quote.method==='upi'?'Find it in your payment receipt':'Copy it from your wallet transaction'}</span><span>{utr.length}/{quote.method==='upi'?12:utr.startsWith('0x')?66:64}</span></div>
     </div>
     <div className="payment-attachment">
      <div className="payment-attachment-label"><span>PAYMENT SCREENSHOT</span><small>JPG, PNG, WEBP · UP TO 5 MB</small></div>
      <label className={`deposit-upload ${file?'has-file':''}`}>
       {file&&filePreview?<img className="payment-upload-preview" src={filePreview} alt="Selected payment screenshot"/>:<span className="payment-upload-icon"><Upload size={23}/></span>}
       <span><b>{file?'Screenshot attached':'Tap to add screenshot'}</b><small>{file?file.name:'Choose from your gallery'}</small></span><span className="payment-upload-badge">{file?<Check size={17}/>:<ArrowUpRight size={19}/>}</span>
       <input ref={fileInput} key={quote.id} aria-label="Payment screenshot" type="file" accept="image/png,image/jpeg,image/webp" required disabled={submitting} onChange={chooseFile}/>
      </label>
      {file&&<div className="payment-file-actions"><span>{(file.size/1024).toFixed(0)} KB · Tap image to replace</span><button type="button" disabled={submitting} onClick={()=>{setFile(null);if(fileInput.current)fileInput.current.value='';}} aria-label="Remove screenshot"><X size={12}/> Remove</button></div>}
     </div>
     {quote.method!=='upi'&&<label className="field"><span className="label">Note (optional)</span><textarea className="input" value={paymentNote} maxLength={500} onChange={e=>setPaymentNote(e.target.value)} placeholder="Late payment, different amount, or other details" disabled={submitting}/></label>}
     <button className="btn btn-primary btn-block deposit-continue payment-submit" disabled={submitting} type="submit"><ShieldCheck size={18}/>{submitting?'Submitting…':'Submit payment proof'}<ArrowUpRight size={17}/></button>
    </form>}
    <button className="btn btn-ghost btn-block" type="button" disabled={submitting} onClick={()=>{setOpen(false);setFile(null);}}>Close · finish later</button>
    <p className="deposit-disclaimer">Your payment details are saved. You can finish later.</p>
   </div>}
  </Sheet>
 </div>;
}
