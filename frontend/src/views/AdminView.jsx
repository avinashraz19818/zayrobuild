import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield, Users, Settings, Coins, Package, Lock, Gauge, Bot, Megaphone, Ticket, Layers, RefreshCw
} from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader } from '../components/ui';
import { admin, api } from '../lib/api';
import { OverviewTab, RequestsTab, OrdersTab, UsersTab } from './admin/AdminTabs';
import TemplatesTab from './admin/TemplatesTab';
import DeployBotTab from './admin/DeployBotTab';
import AnnouncementsTab from './admin/AnnouncementsTab';
import CouponsTab from './admin/CouponsTab';
import SettingsTab from './admin/SettingsTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'templates', label: 'Templates', icon: Layers },
  { key: 'requests', label: 'Deposits', icon: Coins },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'deploy', label: 'Deploy Bot', icon: Bot },
  { key: 'announce', label: 'Announce', icon: Megaphone },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'settings', label: 'Settings', icon: Settings }
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
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await admin.dashboard();
      setStats(data?.stats || null);
      setRecent(data?.recent_orders || []);
    } catch (_) { /* handled by gate */ }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { if (isAdmin) loadStats(); }, [isAdmin, loadStats]);

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
    try { await fn(); if (okMsg) addToast(okMsg, 'success'); } catch (err) { addToast(err.message || 'Action failed', 'error'); }
  };

  const pendingDeposits = stats?.pending_coin_requests || 0;

  return (
    <>
      <section className="admin-head">
        <span className="admin-head-ico"><Shield size={22} /></span>
        <div className="grow">
          <div className="admin-head-title">Admin panel</div>
          <div className="admin-head-sub">
            Store · templates · deposits · orders · users · deploy bot · announcement · coupons
          </div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={loadStats} disabled={loadingStats}>
          <RefreshCw size={13} className={loadingStats ? 'animate-spin' : ''} /> Refresh stats
        </button>
      </section>

      <nav className="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              <Icon size={13} /> {t.label}
              {t.key === 'requests' && pendingDeposits > 0 && (
                <span className="chip chip-danger" style={{ padding: '1px 6px', fontSize: 10 }}>{pendingDeposits}</span>
              )}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' && (
        loadingStats && !stats
          ? <Loader label="Stats load ho rahe hain…" />
          : <OverviewTab stats={stats} recent={recent} refresh={loadStats} />
      )}
      {tab === 'templates' && <TemplatesTab act={act} />}
      {tab === 'requests' && <RequestsTab act={act} refreshStats={loadStats} />}
      {tab === 'orders' && <OrdersTab act={act} />}
      {tab === 'users' && <UsersTab act={act} />}
      {tab === 'deploy' && <DeployBotTab act={act} />}
      {tab === 'announce' && <AnnouncementsTab act={act} />}
      {tab === 'coupons' && <CouponsTab act={act} />}
      {tab === 'settings' && <SettingsTab act={act} />}
    </>
  );
}
