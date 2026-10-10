import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {Box, Download, Radio, Terminal, Users} from 'lucide-react';
import {Bot, Globe, Package, Layers, RefreshCw} from '../components/AnimatedIcon';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader, Notice, SectionHead, StatusPill } from '../components/ui';
import { api, fmtDate, openTelegramLink } from '../lib/api';
import { getMediaUrl } from '../utils/media';
import TelegramGate from '../components/TelegramGate';
const FILTERS=[['all','All orders'],['apk','APKs'],['bot','Bots'],['fake','Fake sites']];
export default function OrdersView({onOpenLogs,onOpenLiveLinks,onOpenDemoAccounts,setTab}) {
  const {config}=useStore(),{user}=useAuth();
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[statusFilter,setStatusFilter]=useState('all');
  const load=useCallback(async(signal)=>{
    if(!user?.id){setRows([]);setLoading(false);return;}
    try{const data=await api.get('/api/me/purchases',{signal});if(!Array.isArray(data))throw Error('Orders load nahi hue.');setRows(data);setError('');}
    catch(e){if(!signal?.aborted)setError(e.message||'Orders load nahi hue. Dobara try karein.');}
    finally{if(!signal?.aborted)setLoading(false);}
  },[user?.id]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);const timer=setInterval(()=>{if(document.visibilityState==='visible')void load(controller.signal);},12000);return()=>{controller.abort();clearInterval(timer);};},[load]);
  const visible=useMemo(()=>rows.filter(r=>(filter==='all'||r.kind===filter)&&(statusFilter==='all'||
    (statusFilter==='ready'&&['done','active'].includes(r.status))||
    (statusFilter==='pending'&&['pending','building','provisioning'].includes(r.status))||
    (statusFilter==='failed'&&(r.status==='failed'||r.refunded))||
    (statusFilter==='inactive'&&['stopped','expired'].includes(r.status)))),[rows,filter,statusFilter]);
  if(!user)return <TelegramGate botLink={config?.bot_link}/>;
  const reload=async()=>{setBusy(true);try{await load();}finally{setBusy(false);}};
  return <>
    <SectionHead icon={Package} title="My Orders" sub="APKs, Welcome Bots aur fake sites — saare orders ek jagah" action={<button className="btn btn-soft btn-sm" onClick={reload} disabled={busy}><RefreshCw size={13}/> Refresh</button>}/>
    <div className="pill-row">{FILTERS.map(([key,label])=><button key={key} className={`pill ${filter===key?'active':''}`} onClick={()=>setFilter(key)}>{label} <span>{key==='all'?rows.length:rows.filter(r=>r.kind===key).length}</span></button>)}</div>
    <label className="flex-row gap-8" style={{margin:'12px 0'}}>Status <select className="input" style={{width:'auto'}} aria-label="Order status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="ready">Ready / active</option><option value="pending">In progress</option><option value="failed">Failed / refunded</option><option value="inactive">Stopped / expired</option></select></label>
    {error&&<Notice tone="danger">{error} <button className="btn btn-soft btn-xs" onClick={reload}>Retry</button></Notice>}
    {loading?<Loader label="Orders load ho rahe hain…"/>:!visible.length?<EmptyState icon={Box} title={rows.length?'Is category mein koi order nahi':'Abhi koi order nahi hai'} text="APK hacks aur Welcome Bot explore karke shuru karein." action={<div className="btn-group"><button className="btn btn-primary" onClick={()=>setTab('templates')}><Layers size={14}/> Hacks</button><button className="btn btn-soft" onClick={()=>setTab('deploy')}><Bot size={14}/> Welcome Bot</button></div>}/>:<div className="stack gap-12">{visible.map(order=>{
      const isBot=order.kind==='bot',isFake=order.kind==='fake',isWebsite=order.source_kind==='account',pending=['pending','building','provisioning'].includes(order.status);
      const Icon=isBot?Bot:isFake?Globe:Package;
      return <article key={order.key} className="card card-pad stack gap-12">
        <div className="flex-row gap-12" style={{alignItems:'flex-start'}}><span className="row-ico" style={{width:44,height:44,overflow:'hidden',flexShrink:0}}>{order.icon_file?<img src={getMediaUrl(order.icon_file)} alt="" loading="lazy" decoding="async"/>:<Icon size={20}/>}</span><div className="grow" style={{minWidth:0}}><div className="flex-row wrap gap-8"><strong>{isBot?`@${order.bot_username}`:order.app_name}</strong>{isBot?<span className={`status ${order.status==='active'?'ok':order.refunded?'danger':'warn'}`}>{order.refunded?'Refunded':order.status}</span>:<StatusPill status={order.status}/>}</div><div className="row-sub">{isBot?(order.purchase_type==='renew'?'Bot renewal':'Welcome Bot'):isFake?'Fake site':'APK'} · #{order.id} · {fmtDate(order.created_at)}</div>{isBot&&<div className="row-sub">{order.plan_name}{order.expires_at&&` · Expires ${fmtDate(order.expires_at)}`}</div>}{isFake&&!isWebsite&&<div className="row-sub">{order.source_kind==='primary'?'Included variant':'Additional variant'} · APK order #{order.order_id}</div>}</div>{(!isFake||isWebsite)&&<span className="chip chip-gold">₹{Number(isBot?order.coins:order.coins_spent).toLocaleString('en-IN')}</span>}</div>
        <div className="btn-group">
          {isBot?<><button className="btn btn-primary btn-sm" onClick={()=>openTelegramLink(`https://t.me/${order.bot_username}?start=manage`)}>Manage in Telegram</button><button className="btn btn-soft btn-sm" onClick={()=>setTab('deploy')}>Bot details / renew</button></>:isWebsite?<><span className="hint">{order.purchase_type==='renew'?'Website renewal':'Website purchase'} · Accounts {order.lease_ids.join(', ')}</span><button className="btn btn-primary btn-sm" onClick={()=>{sessionStorage.setItem('site-store-tab','accounts');setTab('fakesite');}}>Login details / renew</button></>:isFake?<>{order.apk_file&&<a className="btn btn-primary btn-sm" download href={order.source_kind==='extra'?`/api/orders/${order.order_id}/fake-sites/${order.id}/download`:`/api/orders/${order.order_id}/download-fake`}><Download size={14}/> Download fake APK</a>}</>:<>
            {order.apk_file&&<a className="btn btn-primary btn-sm" href={`/api/orders/${order.id}/download`} download><Download size={14}/> Download APK</a>}
            {order.fake_apk_file&&<a className="btn btn-soft btn-sm" href={`/api/orders/${order.id}/download-fake`} download><Globe size={14}/> Fake APK</a>}
            {pending&&<button className="btn btn-soft btn-sm" onClick={()=>onOpenLogs(order.id)}><Terminal size={14}/> Build progress</button>}
            <button className="btn btn-outline btn-sm" onClick={()=>onOpenLiveLinks(order)}><Radio size={14}/> Update link</button><button className="btn btn-ghost btn-sm" onClick={()=>onOpenDemoAccounts?.(order)}><Users size={14}/> Demo accounts</button>
          </>}
        </div>
        {pending&&<p className="hint">{isBot?'Bot setup':'App build'} chal raha hai. Status yahin update hoga.</p>}
        {order.refunded&&<p className="hint">₹{order.coins} wallet mein refund ho chuke hain.</p>}
      </article>;
    })}</div>}
  </>;
}
