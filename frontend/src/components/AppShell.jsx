import React from 'react';
import {
  House, Layers, Globe, Package, User, Gift, Shield, Wallet, LogIn, Boxes, Radio
} from 'lucide-react';
import { displayName, initials } from '../lib/api';

export const NAV = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'templates', label: 'Templates', icon: Layers },
  { key: 'fakesite', label: 'Fake Website', icon: Globe },
  { key: 'refer', label: 'Refer', icon: Gift },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'account', label: 'Account', icon: User }
];

export const MOBILE_KEYS = ['home', 'templates', 'fakesite', 'orders', 'account'];

/** Mobile bottom nav ke liye 5 primary tabs. */
const MOBILE_NAV = NAV.filter((n) => MOBILE_KEYS.includes(n.key));

export function CoinIco({ size = 14 }) {
  return (
    <span className="coin-dot" style={{ width: size + 6, height: size + 6 }}>
      <span style={{ fontSize: size - 3, fontWeight: 900, lineHeight: 1 }}>₹</span>
    </span>
  );
}

export function Brand({ onClick }) {
  return (
    <div className="brand" onClick={onClick}>
      <div className="brand-logo">
        <Boxes size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="brand-name">Zayro Build</div>
        <div className="brand-sub">Premium APK Marketplace</div>
      </div>
    </div>
  );
}

export function TopBar({ tab, setTab, user, isAdmin, orderCount, onAddFund, onAuth }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand onClick={() => setTab('home')} />

        <nav className="desktop-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key || (tab === 'wallet' && item.key === 'account');
            return (
              <button key={item.key} className={active ? 'active' : ''} onClick={() => setTab(item.key)}>
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
          {isAdmin && (
            <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
              <Shield size={15} />
              Admin
            </button>
          )}
        </nav>

        <div className="topbar-spacer" />

        {user ? (
          <div className="flex-row gap-8">
            <button className="balance-chip" onClick={onAddFund} title="Add fund">
              <CoinIco />
              <span>₹{Number(user.coins || 0).toLocaleString('en-IN')}</span>
            </button>
            <button className="avatar-btn" onClick={() => setTab('account')} title={displayName(user)}>
              {user.photo_url ? <img src={user.photo_url} alt="" /> : initials(displayName(user))}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onAuth}>
            <LogIn size={14} />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}

export function BottomNav({ tab, setTab, orderCount }) {
  return (
    <nav className="bottomnav">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        const active = tab === item.key || (tab === 'wallet' && item.key === 'account');
        return (
          <button key={item.key} className={active ? 'active' : ''} onClick={() => setTab(item.key)}>
            {active && <span className="nav-dot" />}
            {item.key === 'orders' && orderCount > 0 && <span className="nav-badge">{orderCount > 9 ? '9+' : orderCount}</span>}
            <span className="nav-ico"><Icon size={20} /></span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function Footer({ isAdmin, setTab }) {
  return (
    <footer style={{ padding: '18px 14px 6px', textAlign: 'center' }}>
      <div className="flex-row gap-10" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('templates')}><Layers size={13} />Templates</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('wallet')}><Wallet size={13} />Wallet</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('refer')}><Gift size={13} />Refer &amp; Earn</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('fakesite')}><Radio size={13} />Fake Website</button>
        {isAdmin && <button className="btn btn-ghost btn-xs" onClick={() => setTab('admin')}><Shield size={13} />Admin</button>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        © {new Date().getFullYear()} ZAYRO BUILD · Premium APK Marketplace · 100% Secure &amp; Fast
      </div>
    </footer>
  );
}
