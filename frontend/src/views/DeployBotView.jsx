import {resellerPrice,resellerPercent} from '../lib/reseller-pricing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {ExternalLink, KeyRound} from 'lucide-react';
import {Bot, ArrowLeft, ArrowRight, Check, RefreshCw, ShieldCheck} from '../components/AnimatedIcon';
import { useAuth } from '../context/AuthContext';
import { api, fmtDate, openTelegramLink } from '../lib/api';
import { Notice, Spinner } from '../components/ui';
import { useToast } from '../components/Toast';
import PurchaseResult from '../components/PurchaseResult';
const money = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const requestKey = () => crypto.randomUUID();

export default function DeployBotView({ setTab }) {
  const { user, refreshUser, openAuth } = useAuth();
  const { addToast } = useToast();
  const [config,setConfig] = useState({ plans:[], enabled:false, ready:false, coin_rate:1 });
  const [rows,setRows] = useState([]), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [open,setOpen] = useState(false), [renew,setRenew] = useState(null);
  const [token,setToken] = useState(''), [verified,setVerified] = useState(null), [adminId,setAdminId] = useState('');
  const [planKey,setPlanKey] = useState(''), [coupon,setCoupon] = useState(''), [quote,setQuote] = useState(null);
  const [busy,setBusy] = useState(''), [key,setKey] = useState(requestKey);
  const [receipt,setReceipt]=useState(null);
  useEffect(()=>{setReceipt(current=>{if(!current)return current;const row=rows.find(r=>r.id===current.id);if(!row)return current;if(row.status==='active')return {...current,pending:false};if(row.status==='failed'||row.refunded)return {...current,pending:false,failed:true,message:row.refunded?'Deployment failed. The charged amount was refunded to your wallet.':'Deployment was not successful. Please review your order status.'};return current;});},[rows]);
  const revision = useRef(0);
  const plan = config.plans.find(p=>p.key===planKey);
  const balance = Number(user?.coins || 0);
  const partnerPercent=resellerPercent(user,'bot');
  const partnerPrice=n=>resellerPrice(n,user,'bot');
  const load = useCallback(async () => {
    try {
      const [c,r] = await Promise.all([api.get('/api/deploy-bot/plans'),user ? api.get('/api/me/bot-deploys') : Promise.resolve([])]);
      if (c?.api_version !== 2 || !Array.isArray(c.plans) || typeof c.ready !== 'boolean') throw new Error('Bot plans abhi load nahi ho paaye. Refresh karein ya thodi der baad try karein.');
      if (!Array.isArray(r) || r.some(row=>!row.plan || !row.bot_username)) throw new Error('Bot purchases load nahi hue. Dobara try karein.');
      setConfig(c); setRows(r); setError(''); setPlanKey(v=>c.plans.some(p=>p.key===v)?v:c.plans[0]?.key||'');
    } catch(e) { setConfig(v=>({...v,ready:false,enabled:false,plans:[]})); setError(e.message); } finally { setLoading(false); }
  },[user?.id]);
  useEffect(()=>{ load(); const timer=setInterval(load,20000); return ()=>clearInterval(timer); },[load]);
  const edit = fn => { revision.current++; fn(); setQuote(null); setKey(requestKey()); };
  const begin = (row=null) => {
    if (!user) { openAuth(); return; }
    edit(()=>{ setOpen(true); setRenew(row); setToken(''); setVerified(null); setCoupon(''); setAdminId(row?.admin_tg_id || String(user.telegram_id||'')); });
  };
  async function verify() {
    const version=revision.current;
    setBusy('verify');
    try { const data=await api.post('/api/deploy-bot/verify',{bot_token:token.trim()}); if(version===revision.current) setVerified(data); }
    catch(e) { addToast(e.message,'error'); } finally { setBusy(''); }
  }
  async function review() {
    const version=revision.current;
    setBusy('quote');
    try { const data=await api.post('/api/deploy-bot/quote',{plan_key:planKey,coupon,renew_id:renew?.id}); if(version===revision.current) setQuote(data); }
    catch(e) { setQuote(null); addToast(e.message,'error'); } finally { setBusy(''); }
  }
  async function purchase(e) {
    e.preventDefault();
    if (!quote) { await review(); return; }
    setBusy('purchase');
    try {
      const result=await api.post('/api/me/bot-deploys',{request_key:key,bot_token:token.trim(),admin_tg_id:adminId,plan_key:planKey,coupon,renew_id:renew?.id,expected_coins:quote.coins});
      setReceipt({bot:true,id:result.request?.id,total:quote.coins,pending:result.request?.status!=='active',message:'Your bot is active. Manage it from your purchases below.'});
      setToken('');setVerified(null);setOpen(false);setKey(requestKey());setQuote(null);
      await Promise.all([load(),refreshUser()]);
    } catch(e) { addToast(e.message,'error'); } finally { setBusy(''); }
  }
  return <div className="welcome-store"><PurchaseResult receipt={receipt} onClose={()=>setReceipt(null)}/>
    <header className="welcome-page-head"><h2><Bot size={25}/> {open?'Bot Deploy':'Deploy Bot'}</h2><button className="btn btn-soft btn-sm" onClick={()=>open?setOpen(false):setTab('home')} disabled={!!busy}><ArrowLeft size={15}/>{open?'Back to bots':'Home'}</button></header>
    {error && <Notice tone="danger">{error} <button className="btn btn-soft btn-xs" onClick={load}>Retry</button></Notice>}

    {loading ? <div className="center-pad"><Spinner/> Loading bots…</div> : !open ? <>
      <button className="welcome-product" onClick={()=>begin()}><span className="welcome-product-icon"><Bot size={32}/></span><span className="grow"><span className="welcome-eyebrow">AUTOMATE YOUR COMMUNITY</span><strong>Welcome Bot</strong><span>Welcome messages, media & buttons. Manage your channels from Telegram.</span><small>{config.plans.length ? `From ${money(partnerPrice(Math.min(...config.plans.map(p=>p.price))))} · ${config.plans.length} plans`:'Plans jaldi available honge'}</small></span><ArrowRight size={22}/></button>
      {!error&&(!config.ready||!config.enabled||!config.plans.length)&&<div className="welcome-availability"><span className="status warn">Coming soon</span><div><b>Welcome Bot ki booking abhi shuru nahi hui.</b><p>Plans available hone par yahin se bot bana paayenge. Abhi koi payment nahi kategi.</p></div></div>}
      <div className="welcome-benefits"><span><Check size={14}/> Custom welcome messages</span><span><Check size={14}/> Channel management</span><span><Check size={14}/> Broadcast tools</span></div>
      <div className="welcome-how"><div><b>01</b><strong>Apna bot connect karein</strong><p>BotFather token verify karein aur apni Telegram ID dein.</p></div><div><b>02</b><strong>Plan choose karein</strong><p>Price aur wallet balance check karke purchase karein.</p></div><div><b>03</b><strong>Bot manage karein</strong><p>Setup ke baad Telegram se welcome messages aur channels manage karein.</p></div></div>
    </> : <form className="welcome-checkout" onSubmit={purchase}>
      <div className="welcome-checkout-title"><span className="welcome-product-icon"><Bot size={26}/></span><div><h3>{renew?`Renew @${renew.bot_username}`:'Deploy Welcome Bot'}</h3><p>Connect your bot, choose a plan and review your purchase.</p></div></div>
      {(!config.enabled || !config.ready) && <Notice tone="warn">Booking abhi band hai. Abhi purchase ya wallet se payment nahi hogi.</Notice>}
      {!renew && <section className="welcome-step"><span className="welcome-step-number">1</span><label htmlFor="welcome-token">Enter your bot token</label><div className="flex-row gap-8"><input id="welcome-token" className="input mono" type="password" autoComplete="new-password" spellCheck={false} placeholder="123456789:AAH…" value={token} disabled={!!busy} onChange={e=>edit(()=>{setToken(e.target.value);setVerified(null);})}/><button className="btn btn-soft" type="button" onClick={verify} disabled={!token || !!busy || !config.ready}>{busy==='verify'?<Spinner/>:verified?<Check size={16}/>:'Verify'}</button></div><p>Make a bot in <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a> with /newbot and paste its token here. Stop any previous hosting for this bot.</p>{verified && <div className="welcome-verified"><Check size={15}/> Verified · @{verified.username}</div>}</section>}
      <section className="welcome-step"><span className="welcome-step-number">{renew?'1':'2'}</span><label htmlFor="welcome-admin">Send your ID</label><div className="flex-row gap-8"><input id="welcome-admin" className="input" inputMode="numeric" placeholder="Telegram ID" value={adminId} disabled={!!busy || !!renew} onChange={e=>edit(()=>setAdminId(e.target.value.replace(/\D/g,'')))}/>{!renew && <button type="button" className="btn btn-soft" disabled={!user?.telegram_id || !!busy} onClick={()=>edit(()=>setAdminId(String(user.telegram_id)))}>Use my ID</button>}</div><p>The Telegram ID of the person who will control this bot. {user?.telegram_id && <>Your ID is <b>{user.telegram_id}</b>.</>}</p><p>Need another ID? Open <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer">@userinfobot</a> from that account and press Start.</p></section>
      <section className="welcome-step"><span className="welcome-step-number done"><Check size={17}/></span><h3>Select plan</h3><div className="welcome-plans" role="radiogroup" aria-label="Bot plan">{config.plans.map(p=>{
        const price=partnerPrice(renew?p.renewal_price:p.price), off=!renew&&p.original_price>price?Math.round((p.original_price-price)*100/p.original_price):0;
        return <button type="button" role="radio" aria-checked={planKey===p.key} key={p.key} className={`welcome-plan ${planKey===p.key?'selected':''}`} onClick={()=>edit(()=>setPlanKey(p.key))} disabled={!!busy}><span className="welcome-plan-days"><b>{p.days}</b><small>days</small></span><span className="welcome-plan-copy"><strong>{p.name}</strong><span><b>{money(price)}</b> {off>0&&<s>{money(p.original_price)}</s>}</span><small><RefreshCw size={12}/> Renews at {money(partnerPrice(p.renewal_price))} · {p.max_channels} channels</small></span><span className="welcome-plan-check">{planKey===p.key&&<Check size={14}/>}</span>{off>0&&<span className="welcome-plan-off">{off}% OFF</span>}</button>;
      })}</div>{!config.plans.length&&<Notice>No plans are published yet.</Notice>}</section>
      {user?.reseller?.status==='active'?<Notice tone="info">Partner pricing · {partnerPercent}% OFF. Coupons do not stack.</Notice>:<div className="field"><label className="label" htmlFor="welcome-coupon">Coupon code (optional)</label><div className="flex-row gap-8"><input className="input" id="welcome-coupon" placeholder="Have a coupon? Enter code" value={coupon} disabled={!!busy} onChange={e=>edit(()=>setCoupon(e.target.value.toUpperCase()))}/><button className="btn btn-soft" type="button" onClick={review} disabled={!plan || !!busy}>Apply</button></div></div>}
      <div className="welcome-total"><div><span>Plan</span><b>{plan?.name||'—'}</b></div><div><span>Price</span><b>{money(renew?plan?.renewal_price:plan?.price)}</b></div>{quote?.discount>0&&<div><span>{quote?.reseller_price?.reseller ? 'Reseller discount' : 'Coupon discount'}</span><b>−{money(quote.discount)}</b></div>}<div><span>Your balance</span><b>₹{balance.toLocaleString('en-IN')}</b></div><div><span>{quote?'Total to pay':'Estimated total'}</span><b>{quote?money(quote.coins):money(partnerPrice(renew?plan?.renewal_price:plan?.price))}</b></div></div>
      {quote&&balance<quote.coins&&<p className="welcome-shortfall">You need ₹{quote.coins-balance} more. <button type="button" onClick={()=>setTab('wallet')}>Add funds</button></p>}
      <p className="welcome-refund"><ShieldCheck size={17}/><span>If deployment is confirmed unsuccessful, the charged amount returns to your wallet automatically. Pending requests are checked before a refund.</span></p>
      <div className="welcome-checkout-actions"><button type="button" className="btn btn-outline" disabled={!!busy} onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary" type="submit" disabled={!!busy || !plan || !config.enabled || !config.ready || (!renew&&!verified) || !adminId || (quote&&balance<quote.coins)}>{busy?<Spinner/>:<KeyRound size={16}/>} {busy==='purchase'?'Processing…':quote?'Purchase':'Review purchase'}</button></div>
    </form>}
    {!open&&<section className="section"><div className="flex-row between"><h3>My bots & purchases</h3><button className="btn btn-ghost btn-sm" onClick={()=>{load();refreshUser();}}><RefreshCw size={14}/> Refresh</button></div>{!rows.length?<div className="welcome-empty"><Bot size={22}/><div><b>Abhi koi bot purchase nahi hai</b><p>Shuru karne ke liye upar Welcome Bot card par tap karein.</p></div></div>:<div className="stack gap-12">{rows.map(r=><article className="card card-pad stack gap-10" key={r.id}><div className="flex-row between wrap"><b>{r.kind==='renew'?'Renewal · ':''}@{r.bot_username}</b><span className={`status ${r.status==='active'?'ok':r.status==='failed'?'danger':'warn'}`}>{r.refunded?'Refunded':r.status}</span></div><span className="hint">{r.plan.name} · ₹{r.coins} · #{r.id}{r.expires_at&&<> · Expires {fmtDate(r.expires_at)}</>}</span><div className="btn-group">{r.kind==='deploy'&&r.bot_username&&<button className="btn btn-soft btn-sm" onClick={()=>openTelegramLink(`https://t.me/${r.bot_username}?start=manage`)}>Manage in Telegram <ExternalLink size={13}/></button>}{r.kind==='deploy'&&!r.refunded&&!['pending','provisioning'].includes(r.status)&&<button className="btn btn-outline btn-sm" onClick={()=>begin(r)}>Renew plan</button>}</div>{['pending','provisioning'].includes(r.status)&&<p className="hint">Setup is in progress. You can leave this page; your purchase is saved.</p>}</article>)}</div>}</section>}
  </div>;
}
