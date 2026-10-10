import React, { useEffect, useState } from 'react';
import {Gauge, IndianRupee as Coins, TrendingUp, CheckCircle, XCircle} from 'lucide-react';
import {Package, RefreshCw} from '../../components/AnimatedIcon';
import { useToast } from '../../components/Toast';
import { EmptyState, Loader, Notice, SectionHead, Stat, StatusPill } from '../../components/ui';
import { admin, api, fmtDate } from '../../lib/api';

/* ─────────────────────────  Overview  ───────────────────────── */
export function OverviewTab({ stats, recent, refresh }) {
  if (!stats) return <Loader label="Stats load ho rahe hain…" />;
  return (
    <>
      <div className="admin-kpi">
        <Stat value={`₹${Number(stats.sales_today||0).toLocaleString('en-IN')}`} label="Today's sales (IST)" />
        <Stat value={`₹${Number(stats.sales_total||0).toLocaleString('en-IN')}`} label="Total sales" />
        <Stat value={stats.total_users} label="Users" />
        <Stat value={stats.users_today} label="New today" />
        <Stat value={stats.total_orders} label="Orders" />
        <Stat value={stats.completed_orders} label="Completed" />
        <Stat value={stats.pending_orders + stats.building_orders} label="In queue" />
        <Stat value={stats.failed_orders} label="Failed" />
        <Stat value={stats.total_apks_built} label="APKs built" />
        <Stat value={stats.fake_apks_built} label="Fake APKs" />
        <Stat value={stats.total_user_coins} label="Wallet balance (₹)" />
        <Stat value={stats.coins_spent_total} label="Amount spent (₹)" />
        <Stat value={stats.pending_coin_requests} label="Pending deposits" />
        <Stat value={`₹${stats.pending_coin_amount}`} label="Amount pending" />
      </div>

      <p className="hint">Recorded APK + website + bot purchases, including renewals. Refunded bot payments excluded. Not wallet deposits or profit.</p>
      <div className="admin-card-head">
        <SectionHead icon={TrendingUp} title="Recent orders" sub="Latest builds ki live list" />
        <button className="btn btn-soft btn-xs" onClick={refresh}><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className="stack gap-8">
        {recent.length === 0 && <Notice tone="info">Abhi koi order nahi aaya.</Notice>}
        {recent.map((o) => (
          <div key={o.id} className="row-item">
            <span className="row-ico"><Package size={16} /></span>
            <span className="row-main">
              <span className="row-title truncate">{o.app_name}</span>
              <span className="row-sub truncate">{o.user_name} · {o.design_name} · {fmtDate(o.created_at)}</span>
            </span>
            <span className="flex-row gap-6">
              <span className="chip">{o.apk_count} APK</span>
              <StatusPill status={o.status} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────  Coin requests  ───────────────────────── */
export function RequestsTab({ act, refreshStats }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [received,setReceived]=useState({});
  const [cryptoHealth,setCryptoHealth]=useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.coinRequests();
      try{setCryptoHealth(await api.get('/api/admin/crypto-status'));}catch{setCryptoHealth(null);}
      setRows(Array.isArray(data) ? data : (data?.requests || []));
    } catch (err) { addToast(err.message || 'Load failed', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (loading) return <Loader label="Deposit requests load ho rahi hain…" />;

  return (
    <div className="admin-table">
      <div className="admin-card-head">
        <div className="row-title"><Coins size={15} style={{ verticalAlign: -2 }} /> Deposit requests ({rows.length})</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      {cryptoHealth&&<div className="card card-pad stack gap-8"><b>USDT automatic monitoring</b><span className="hint">TRC20: {cryptoHealth.networks?.trc20?'Enabled':'Not enabled'} · BEP20: {cryptoHealth.networks?.bep20?'Enabled':'Not enabled'}</span>{cryptoHealth.readers?.map(r=><span key={r.network+r.address} className="hint" style={{overflowWrap:'anywhere'}}>{r.network.toUpperCase()} · {r.address} · {r.error|| (r.last_ok?'Last check '+new Date(r.last_ok).toLocaleString():'Starting')}</span>)}<span className="hint">Unmatched / review transfers: {cryptoHealth.unmatched?.length||0}</span></div>}
      {rows.length === 0 ? (
        <EmptyState icon={Coins} title="Koi deposit request nahi" text="Users jab UPI payment submit karte hain, requests yahan aati hain." />
      ) : rows.map((r) => (
        <article key={r.id} className="card card-pad stack gap-10">
          <div className="flex-row between wrap gap-10">
            <div>
              <div className="row-title">₹{r.coins_requested} wallet credit</div>
              {r.payment_method && r.payment_method !== 'upi' && <div className="row-sub" style={{overflowWrap:'anywhere'}}>USDT {r.payment_method.toUpperCase()} · {r.payment_amount} USDT · ₹{r.payment_rate}/USDT · Bonus ₹{r.payment_bonus}<br/>Confirmed chain observation: {r.chain_received_micro ? `${Number(r.chain_received_micro)/1000000} USDT · ${r.chain_state}` : 'Not observed by monitor — verify independently'}<br/>Customer note: {r.payment_note || '—'}<br/>Receiving address: {r.payment_address}<br/>Check the actual transfer, correct token, network, recipient and confirmations before approval.</div>}
              <div className="row-sub">User #{r.user_id} · UTR {r.utr} · {fmtDate(r.created_at)}</div>
            </div>
            <StatusPill status={r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'failed' : 'pending'} />
          </div>
          {r.screenshot_file && (
            <a className="btn btn-soft btn-xs" href={`/api/files/${encodeURIComponent(r.screenshot_file)}`} target="_blank" rel="noreferrer">
              View payment screenshot
            </a>
          )}
          {r.status==='pending'&&r.payment_method&&r.payment_method!=='upi'&&<div className="stack gap-8"><label className="field"><span className="label">Received USDT — verify on chain before approval</span><input className="input" inputMode="decimal" value={received[r.id]??r.payment_amount??''} onChange={e=>setReceived(v=>({...v,[r.id]:e.target.value}))}/></label><button className="btn btn-soft btn-sm" onClick={()=>act(async()=>{await api.post(`/api/admin/coin-requests/${r.id}/received-amount`,{received_amount:received[r.id]??r.payment_amount});await load();},'Received amount updated; review the new ₹ credit before approval')}>Update received amount / recalculate credit</button></div>}
          {r.status === 'pending' && (
            <div className="btn-group">
              <button className="btn btn-primary btn-sm" onClick={() => act(async () => { await admin.approve(r.id); await load(); await refreshStats?.(); }, 'Request approved')}>
                <CheckCircle size={14} /> Approve
              </button>
              <button className="btn btn-soft btn-sm" onClick={() => act(async () => { await admin.reject(r.id); await load(); await refreshStats?.(); }, 'Request rejected')}>
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export { OrdersTab, UsersTab } from './AdminManagement';
export { Gauge };
