import React, { useEffect, useState } from 'react';
import {
  Gauge, Users, Package, Coins, TrendingUp, RefreshCw, Plus, RotateCcw, CheckCircle, XCircle
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { EmptyState, Loader, Notice, SectionHead, Stat, StatusPill } from '../../components/ui';
import { admin, fmtDate, displayName } from '../../lib/api';

/* ─────────────────────────  Overview  ───────────────────────── */
export function OverviewTab({ stats, recent, refresh }) {
  if (!stats) return <Loader label="Stats load ho rahe hain…" />;
  return (
    <>
      <div className="admin-kpi">
        <Stat value={stats.total_users} label="Users" />
        <Stat value={stats.users_today} label="New today" />
        <Stat value={stats.total_orders} label="Orders" />
        <Stat value={stats.completed_orders} label="Completed" />
        <Stat value={stats.pending_orders + stats.building_orders} label="In queue" />
        <Stat value={stats.failed_orders} label="Failed" />
        <Stat value={stats.total_apks_built} label="APKs built" />
        <Stat value={stats.fake_apks_built} label="Fake APKs" />
        <Stat value={stats.total_user_coins} label="Coins in wallets" />
        <Stat value={stats.coins_spent_total} label="Coins spent" />
        <Stat value={stats.pending_coin_requests} label="Pending deposits" />
        <Stat value={`₹${stats.pending_coin_amount}`} label="Amount pending" />
      </div>

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
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.coinRequests();
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
      {rows.length === 0 ? (
        <EmptyState icon={Coins} title="Koi coin request nahi" text="Users jab UPI payment submit karte hain, requests yahan aati hain." />
      ) : rows.map((r) => (
        <article key={r.id} className="card card-pad stack gap-10">
          <div className="flex-row between wrap gap-10">
            <div>
              <div className="row-title">{r.coins_requested} coins · ₹{r.amount_paid}</div>
              <div className="row-sub">User #{r.user_id} · UTR {r.utr} · {fmtDate(r.created_at)}</div>
            </div>
            <StatusPill status={r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'failed' : 'pending'} />
          </div>
          {r.screenshot_file && (
            <a className="btn btn-soft btn-xs" href={`/api/files/${encodeURIComponent(r.screenshot_file)}`} target="_blank" rel="noreferrer">
              View payment screenshot
            </a>
          )}
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

/* ─────────────────────────  Orders  ───────────────────────── */
export function OrdersTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.orders();
      setRows(Array.isArray(data) ? data : (data?.orders || []));
    } catch (err) { addToast(err.message || 'Load failed', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const visible = filter === 'all' ? rows : rows.filter((o) => o.status === filter);

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><Package size={15} style={{ verticalAlign: -2 }} /> Orders ({rows.length})</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className="admin-pill-grid">
        {['all', 'done', 'building', 'pending', 'failed'].map((f) => (
          <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'done' ? 'Ready' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Loader label="Orders load ho rahe hain…" /> : visible.length === 0 ? (
        <EmptyState icon={Package} title="Koi order nahi" text="Store se pehla order aate hi yahan list dikhegi." />
      ) : (
        <div className="admin-table">
          {visible.map((o) => (
            <div key={o.id} className="row-item">
              <span className="row-ico"><Package size={16} /></span>
              <span className="row-main">
                <span className="row-title truncate">{o.app_name} <span className="muted">#{o.id}</span></span>
                <span className="row-sub truncate">
                  {o.user_name || o.username || `User #${o.user_id}`} · {o.design_name || 'Template'} · {fmtDate(o.created_at)}
                </span>
              </span>
              <span className="flex-row gap-6">
                {o.apk_file && <a className="btn btn-soft btn-xs" href={`/api/orders/${o.id}/download`}>APK</a>}
                <button className="btn btn-ghost btn-xs" title="Rebuild" onClick={() => act(async () => { await admin.rebuild(o.id); await load(); }, 'Rebuild queued')}>
                  <RotateCcw size={13} />
                </button>
                <StatusPill status={o.status} />
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────  Users  ───────────────────────── */
export function UsersTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coinUser, setCoinUser] = useState(null);
  const [delta, setDelta] = useState(100);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.users();
      setRows(Array.isArray(data) ? data : (data?.users || []));
    } catch (err) { addToast(err.message || 'Load failed', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><Users size={15} style={{ verticalAlign: -2 }} /> Users ({rows.length})</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {loading ? <Loader label="Users load ho rahe hain…" /> : rows.length === 0 ? (
        <EmptyState icon={Users} title="Koi user nahi" text="Telegram se pehla user aate hi list dikhegi." />
      ) : (
        <div className="admin-table">
          {rows.map((u) => (
            <div key={u.id} className="admin-user-item">
              <span className="row-ico gold">{Number(u.coins || 0)}</span>
              <span className="row-main">
                <span className="row-title truncate">{displayName(u)}</span>
                <span className="row-sub truncate">
                  @{u.username || '—'} · {u.telegram_id ? `TG ${u.telegram_id}` : u.email} · {fmtDate(u.created_at)}
                </span>
              </span>
              <button className="btn btn-soft btn-xs" onClick={() => { setCoinUser(u); setDelta(100); }}>
                <Plus size={12} /> Coins
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Coins adjust sheet */}
      {coinUser && (
        <div className="card card-pad stack gap-12">
          <div className="row-title"><Coins size={14} style={{ verticalAlign: -2 }} /> Adjust coins · {displayName(coinUser)}</div>
          <div className="field">
            <span className="label">Coins delta (negative = kaat lo)</span>
            <input className="input" type="number" value={delta} onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="admin-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => act(async () => {
                await admin.setCoins(coinUser.id, delta);
                await load();
                setCoinUser(null);
              }, 'Coins update ho gaye')}
            >
              Apply {delta >= 0 ? '+' : ''}{delta} coins
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCoinUser(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

export { Gauge };
