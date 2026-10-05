import React, { useEffect, useState } from 'react';
import {
  Shield, Users, CheckCircle, XCircle, RefreshCw, Settings, Coins, Package, Lock,
  Gauge, TrendingUp, Save, Plus, RotateCcw, Server, Bell
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader, Notice, SectionHead, Sheet, Stat, StatusPill } from '../components/ui';
import { admin, api, fmtDate, displayName } from '../lib/api';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'requests', label: 'Coin requests', icon: Coins },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'settings', label: 'Settings', icon: Settings }
];

const SETTING_FIELDS = [
  { key: 'site_name', label: 'Store name', type: 'text' },
  { key: 'site_url', label: 'Site URL', type: 'text' },
  { key: 'upi_id', label: 'UPI ID', type: 'text' },
  { key: 'coin_rate', label: 'Coin rate (₹ per coin)', type: 'text' },
  { key: 'addon_fake_price', label: 'Fake addon price (coins)', type: 'text' },
  { key: 'domain_change_price', label: 'Domain change price (coins)', type: 'text' },
  { key: 'invite_code_change_price', label: 'Invite change price (coins)', type: 'text' },
  { key: 'telegram_support_user', label: 'Support username', type: 'text' },
  { key: 'telegram_channel_url', label: 'Channel URL', type: 'text' }
];

function AdminLogin({ onDone }) {
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/admin/login', { username: username.trim(), password });
      addToast('Admin session started', 'success');
      onDone?.();
    } catch (err) {
      addToast(err.message || 'Invalid credentials', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="card card-pad stack gap-12" style={{ maxWidth: 420, margin: '30px auto' }}>
      <span className="row-ico danger" style={{ width: 46, height: 46, borderRadius: 15 }}><Lock size={20} /></span>
      <div>
        <div className="sheet-title">Admin access</div>
        <div className="sheet-sub">Sirf admin credentials se panel khulega.</div>
      </div>
      <form className="stack gap-12" onSubmit={submit}>
        <div className="field">
          <span className="label">Username</span>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <span className="label">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Checking…' : 'Unlock admin panel'}</button>
      </form>
    </div>
  );
}

export default function AdminView() {
  const { addToast } = useToast();
  const { isAdmin, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [unlocked, setUnlocked] = useState(false);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [coinUser, setCoinUser] = useState(null);
  const [coinDelta, setCoinDelta] = useState(100);
  const [settingsDraft, setSettingsDraft] = useState({});

  const loadStats = async () => {
    try {
      const data = await admin.dashboard();
      setStats(data?.stats || null);
      setRecent(data?.recent_orders || []);
      setUnlocked(true);
    } catch (_) { setUnlocked(false); }
  };

  const loadTab = async (which) => {
    setLoading(true);
    try {
      if (which === 'requests') {
        const data = await admin.coinRequests();
        setRequests(data?.requests || data || []);
      } else if (which === 'orders') {
        const data = await admin.orders();
        setOrders(data?.orders || data || []);
      } else if (which === 'users') {
        const data = await admin.users();
        setUsers(data?.users || data || []);
      } else if (which === 'settings') {
        const data = await admin.settings();
        const flat = data?.settings || data || {};
        setSettings(flat);
        setSettingsDraft(flat);
      }
    } catch (err) {
      addToast(err.message || 'Load failed', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) loadStats(); /* eslint-disable-next-line */ }, [isAdmin]);
  useEffect(() => { if (isAdmin) loadTab(tab); /* eslint-disable-next-line */ }, [tab, isAdmin]);

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Admin panel locked"
        text="Ye area sirf admin ke liye hai. Neeche admin credentials se unlock karein."
        action={<AdminLogin onDone={() => { refreshUser(); setTimeout(loadStats, 300); }} />}
      />
    );
  }

  const act = async (fn, okMsg) => {
    try { await fn(); addToast(okMsg, 'success'); } catch (err) { addToast(err.message || 'Action failed', 'error'); }
  };

  const saveAllSettings = async () => {
    const keys = SETTING_FIELDS.map((f) => f.key);
    try {
      const payload = {};
      keys.forEach((k) => { if (settingsDraft[k] !== undefined) payload[k] = settingsDraft[k]; });
      await api.post('/api/admin/settings', payload);
      addToast('Settings saved', 'success');
      loadTab('settings');
    } catch (err) { addToast(err.message || 'Save failed', 'error'); }
  };

  return (
    <>
      <SectionHead
        icon={Shield}
        title="Admin panel"
        sub="Store, users, orders aur payments — sab ek jagah"
        action={<button className="btn btn-soft btn-sm" onClick={() => { loadStats(); loadTab(tab); }}><RefreshCw size={13} />Refresh</button>}
      />

      <div className="pill-row">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} className={`pill ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <Icon size={13} /> {t.label}
              {t.key === 'requests' && stats?.pending_coin_requests > 0 && <span className="chip chip-danger" style={{ padding: '1px 6px' }}>{stats.pending_coin_requests}</span>}
            </button>
          );
        })}
      </div>

      {loading && <Loader label="Data load ho raha hai…" />}

      {tab === 'overview' && stats && (
        <>
          <div className="stat-grid">
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

          <SectionHead icon={TrendingUp} title="Recent orders" />
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
      )}

      {tab === 'requests' && (
        <div className="stack gap-10">
          {requests.length === 0 && !loading && <EmptyState icon={Coins} title="Koi coin request nahi" text="Users jab UPI payment submit karte hain, requests yahan aati hain." />}
          {requests.map((r) => (
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
                  <button className="btn btn-primary btn-sm" onClick={() => act(async () => { await admin.approve(r.id); await Promise.all([loadTab('requests'), loadStats()]); }, 'Request approved')}>
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button className="btn btn-soft btn-sm" onClick={() => act(async () => { await admin.reject(r.id); await Promise.all([loadTab('requests'), loadStats()]); }, 'Request rejected')}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="stack gap-8">
          {orders.length === 0 && !loading && <EmptyState icon={Package} title="Koi order nahi" text="Store se pehla order aate hi yahan list dikhegi." />}
          {orders.map((o) => (
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
                <button className="btn btn-ghost btn-xs" title="Rebuild" onClick={() => act(async () => { await admin.rebuild(o.id); }, 'Rebuild queued')}>
                  <RotateCcw size={13} />
                </button>
                <StatusPill status={o.status} />
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="stack gap-8">
          {users.length === 0 && !loading && <EmptyState icon={Users} title="Koi user nahi" text="Telegram se pehla user aate hi list dikhegi." />}
          {users.map((u) => (
            <div key={u.id} className="row-item">
              <span className="row-ico gold">{Number(u.coins || 0)}</span>
              <span className="row-main">
                <span className="row-title truncate">{displayName(u)} <span className="muted">@{u.username}</span></span>
                <span className="row-sub truncate">
                  {u.telegram_id ? `TG ${u.telegram_id}` : u.email} · {fmtDate(u.created_at)}
                </span>
              </span>
              <button className="btn btn-soft btn-xs" onClick={() => { setCoinUser(u); setCoinDelta(100); }}>
                <Plus size={12} /> Coins
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'settings' && (
        <div className="card card-pad stack gap-12">
          <div className="flex-row gap-8">
            <Server size={15} color="var(--info)" />
            <span className="row-title">Store settings</span>
          </div>
          {SETTING_FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <span className="label">{f.label}</span>
              <input
                className="input"
                value={settingsDraft[f.key] ?? ''}
                placeholder={settings[f.key] ? '' : 'not set'}
                onChange={(e) => setSettingsDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex-row gap-8">
            <Bell size={13} color="var(--muted)" />
            <span className="hint">Bot token, QR image aur announcements admin ke purane dashboard se manage hote hain.</span>
          </div>
          <button className="btn btn-primary" onClick={saveAllSettings}><Save size={15} /> Save settings</button>
        </div>
      )}

      <Sheet
        open={Boolean(coinUser)}
        onClose={() => setCoinUser(null)}
        icon={Coins}
        title={coinUser ? `Adjust coins · ${displayName(coinUser)}` : ''}
        subtitle="Positive number add karega, negative number kaatega"
      >
        <div className="field">
          <span className="label">Coins delta</span>
          <input className="input" type="number" value={coinDelta} onChange={(e) => setCoinDelta(parseInt(e.target.value, 10) || 0)} />
        </div>
        <div className="sheet-foot">
          <button className="btn btn-soft" onClick={() => setCoinUser(null)}>Cancel</button>
          <button
            className="btn btn-primary grow"
            onClick={() => act(async () => {
              await admin.setCoins(coinUser.id, coinDelta);
              await loadTab('users');
              setCoinUser(null);
            }, 'Coins updated')}
          >
            Apply {coinDelta >= 0 ? '+' : ''}{coinDelta} coins
          </button>
        </div>
      </Sheet>
    </>
  );
}
