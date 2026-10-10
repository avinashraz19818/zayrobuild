import React,{useEffect,useState} from 'react';
import {api} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import {User as Users,Wallet,RefreshCw} from '../components/AnimatedIcon';
import ResellerReport,{DateRange,todayRange,money,paise} from '../components/ResellerReport';
import '../reseller.css';
export default function ResellerView({setTab}){
 const {refreshUser}=useAuth();const [range,setRange]=useState(todayRange),[data,setData]=useState(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{const c=new AbortController();setLoading(true);setData(null);setError('');api.get(`/api/me/reseller?${new URLSearchParams(range)}`,{signal:c.signal}).then(d=>{if(!c.signal.aborted)setData(d);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[range,revision]);
 return <div className="rs-page"><section className="rs-hero"><span className="rs-kicker"><Users size={17}/> RESELLER PARTNER</span><h1>Your business, one dashboard.</h1><p>Discounted purchases. Clear wallet records. Your customer payments stay with you.</p><button className="btn btn-soft" onClick={()=>{setRevision(x=>x+1);refreshUser();}}><RefreshCw size={15}/> Refresh</button></section>
 <DateRange range={range} setRange={setRange}/>{error&&<div role="alert" className="rs-error">{error}</div>}{loading?<p>Loading reseller report…</p>:data?.profile?<>
 <div className="rs-status">Partner status: <b>{data.profile.status}</b>{data.profile.status!=='active'&&<p>Reseller discounts are not available. Contact admin for activation.{data.profile.status==='suspended'?' New purchases are blocked; your existing orders remain accessible.':''}</p>}</div>
 <div className="rs-stats">{[['APK',data.profile.apk_percent,'templates'],['Bot',data.profile.bot_percent,'deploy'],['Website',data.profile.site_percent,'fakesite']].map(([label,percent,tab])=><button className="rs-stat" key={label} onClick={()=>setTab(tab)}><span>{label} discount</span><strong>{percent}% OFF</strong><small>Browse services →</small></button>)}<button className="rs-stat" onClick={()=>setTab('wallet')}><span><Wallet size={14}/> Wallet balance</span><strong>{money(data.wallet)}</strong><small>Add funds →</small></button></div>
 <div className="card card-pad"><h3>Potential resale margin: {paise(data.lifetime.potential_margin_paise)}</h3><p className="rs-muted">Retail price minus your purchase price on non-refunded reseller orders. This is not confirmed profit or a withdrawable balance. Actual customer collections and your expenses are outside this panel. Coupons cannot be added to reseller rates.</p></div>
 <ResellerReport data={data}/></>:!error&&<div className="card card-pad"><h3>Reseller access is invite-only</h3><p>Ask admin to activate your customer account. Your existing wallet will be used—no separate payment account needed.</p></div>}
 </div>;
}
