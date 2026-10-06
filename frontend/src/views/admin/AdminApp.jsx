import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield, Users, Settings, Coins, Package, Lock, Gauge, Megaphone, Gift, Layers,
  RefreshCw, LogOut, Store, Loader2, CheckCircle2, Link2, DatabaseBackup
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { admin, api } from '../../lib/api';
import { OverviewTab, RequestsTab, OrdersTab, UsersTab } from './AdminTabs';
import TemplatesTab from './TemplatesTab';
import AnnouncementsTab from './AnnouncementsTab';
import GiftCodesTab from './GiftCodesTab';
import SettingsTab from './SettingsTab';
import ContentLinksTab from './ContentLinksTab';
import BackupsTab from './BackupsTab';
import CreateOrderModal from './CreateOrderModal';

// Admin panel ke tabs — apna alag shell, main store panel se bilkul alag page.
const TABS = [
  { key: 'overview',  label: 'Overview',   sub: 'Aaj ka hisaab',        icon: Gauge },
  { key: 'templates', label: 'Templates',  sub: 'Designs & pricing',    icon: Layers },
  { key: 'requests',  label: 'Deposits',   sub: 'Coin requests',        icon: Coins },
  { key: 'orders',    label: 'Orders',     sub: 'Builds & APKs',        icon: Package },
  { key: 'users',     label: 'Users',      sub: 'Accounts & coins',     icon: Users },
  { key: 'links',     label: 'Content Links', sub: 'Remote HTML URLs',  icon: Link2 },
  { key: 'gift',      label: 'Gift Codes', sub: 'Codes & claims',       icon: Gift },
  { key: 'announce',  label: 'Announce',   sub: 'Popup news',           icon: Megaphone },
  { key: 'backups',   label: 'Backups',    sub: 'Database safety copies', icon: DatabaseBackup },
  { key: 'settings',  label: 'Settings',   sub: 'Logo & store',         icon: Settings }
];

const TITLE = Object.fromEntries(TABS.map(t => [t.key, t]));

/* ───────────────────────── Admin login (alag page) ───────────────────────── */
function AdminLogin({ onDone }) {
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/admin/login', { username: username.trim(), password });
      addToast('Admin session shuru — swagat!', 'success');
      onDone?.();
    } catch (err) {
      addToast(err.message || 'Username ya password galat hai', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className="admin-login-wrap">
      <form className="admin-login" onSubmit={submit}>
        <span className="admin-login-glow" aria-hidden="true" />
        <span className="admin-login-badge"><Shield size={22} /></span>
        <h1 className="admin-login-title">Admin Panel</h1>
        <p className="admin-login-sub">Owner access — sirf admin credentials se khulega.</p>

        <label className="admin-login-field">
          <span>Username</span>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)}
                 autoComplete="username" placeholder="admin username" autoFocus />
        </label>
        <label className="admin-login-field">
          <span>Password</span>
          <div className="admin-login-pass">
            <input className="input" type={show ? 'text' : 'password'} value={password}
                   onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                   placeholder="••••••••" />
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setShow(v => !v)}>
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button className="btn btn-primary btn-block" disabled={busy || !username || !password}>
          {busy ? <><Loader2 size={15} className="animate-spin" /> Check kar rahe hain…</> : <><Lock size={15} /> Unlock panel</>}
        </button>

        <a className="admin-login-back" href="/">← Store panel par wapas</a>
      </form>
    </div>
  );
}

/* ───────────────────────── Standalone admin shell ───────────────────────── */
export default function AdminApp() {
  const { addToast } = useToast();
  const { isAdmin, user, refreshUser, loading } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await admin.dashboard();
      setStats(data?.stats || null);
      setRecent(data?.recent_orders || []);
    } catch (_) { /* gate handles */ }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { if (isAdmin) loadStats(); }, [isAdmin, loadStats]);
  useEffect(() => { document.title = 'Admin Panel · ZAYRO BUILD'; }, []);

  if (loading && !isAdmin) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login" style={{ alignItems: 'center' }}>
          <Loader2 size={26} className="animate-spin" />
          <span className="admin-login-sub" style={{ marginTop: 10 }}>Session check ho raha hai…</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin onDone={() => { refreshUser(); setTimeout(loadStats, 200); }} />;
  }

  const act = async (fn, okMsg) => {
    try { await fn(); if (okMsg) addToast(okMsg, 'success'); } catch (err) { addToast(err.message || 'Action fail hua', 'error'); }
  };

  const pendingDeposits = stats?.pending_coin_requests || 0;
  const meta = TITLE[tab] || TITLE.overview;

  const body = (() => {
    switch (tab) {
      case 'templates': return <TemplatesTab act={act} />;
      case 'requests':  return <RequestsTab act={act} refreshStats={loadStats} />;
      case 'orders':    return <OrdersTab act={act} onCreate={() => setShowCreate(true)} />;
      case 'links':     return <ContentLinksTab act={act} />;
      case 'backups':   return <BackupsTab act={act} />;
      case 'users':     return <UsersTab act={act} />;
      case 'gift':      return <GiftCodesTab act={act} />;
      case 'announce':  return <AnnouncementsTab act={act} />;
      case 'settings':  return <SettingsTab act={act} />;
      case 'overview':
      default:          return <OverviewTab stats={stats} recent={recent} refresh={loadStats} />;
    }
  })();

  const logout = async () => {
    try { await api.post('/api/logout', {}); } catch (_) {}
    addToast('Admin logout', 'info');
    window.location.href = '/';
  };

  return (
    <div className="admin-app">
      {/* Sidebar (desktop) / drawer (mobile) */}
      <aside className={`admin-side ${navOpen ? 'open' : ''}`}>
        <div className="admin-side-head">
          <span className="admin-side-logo"><Shield size={18} /></span>
          <div>
            <div className="admin-side-name">Admin Panel</div>
            <div className="admin-side-store">ZAYRO BUILD</div>
          </div>
        </div>

        <nav className="admin-side-nav">
          {TABS.map(({ key, label, sub, icon: Icon }) => (
            <button
              key={key}
              className={`admin-side-item ${tab === key ? 'active' : ''}`}
              onClick={() => { setTab(key); setNavOpen(false); }}
            >
              <span className="admin-side-ico"><Icon size={16} /></span>
              <span className="admin-side-text">
                <b>{label}</b>
                <small>{sub}</small>
              </span>
              {key === 'requests' && pendingDeposits > 0 && <span className="admin-side-badge">{pendingDeposits}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-side-foot">
          <div className="admin-side-user">
            <span className="admin-avatar">{(user?.username || 'a').slice(0, 1).toUpperCase()}</span>
            <span className="grow truncate">
              <b>{user?.username || 'admin'}</b>
              <small>Admin session</small>
            </span>
          </div>
          <div className="admin-side-actions">
            <a className="btn btn-soft btn-sm" href="/"><Store size={14} /> Store panel</a>
            <button className="btn btn-ghost btn-sm" onClick={logout}><LogOut size={14} /> Logout</button>
          </div>
        </div>
      </aside>

      {navOpen && <button className="admin-scrim" aria-label="close" onClick={() => setNavOpen(false)} />}

      {/* Create Order (FREE) — admin kisi bhi user ke liye order bana sakta hai */}
      <CreateOrderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onDone={() => { loadStats(); setTab('orders'); }}
      />

      {/* Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setNavOpen(v => !v)} aria-label="menu">
            <span /><span /><span />
          </button>
          <div className="grow">
            <div className="admin-topbar-title">{meta.label}</div>
            <div className="admin-topbar-sub">{meta.sub}</div>
          </div>
          <span className="admin-live"><CheckCircle2 size={13} /> live</span>
          <button className="btn btn-soft btn-sm" onClick={loadStats} disabled={loadingStats}>
            <RefreshCw size={13} className={loadingStats ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>

        <div className="admin-body">
          {tab === 'overview' && loadingStats && !stats
            ? <div className="center-pad"><span className="spinner" /><span>Stats aa rahe hain…</span></div>
            : body}
        </div>
      </main>
    </div>
  );
}
