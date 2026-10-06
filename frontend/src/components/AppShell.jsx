import React from 'react';
import {
  House, Layers, Globe, Package, User, Gift, Shield, Wallet, Send, Bot, Radio, ChevronRight
} from 'lucide-react';
import { displayName, initials, openTelegramLink } from '../lib/api';
import { useStore } from '../context/StoreContext';

export const NAV = [
  { key: 'home', label: 'Home', icon: House },
  { key: 'deploy', label: 'Deploy Bot', icon: Bot },
  { key: 'templates', label: 'Templates', icon: Layers },
  { key: 'fakesite', label: 'Fake Website', icon: Globe },
  { key: 'refer', label: 'Refer', icon: Gift },
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'account', label: 'Account', icon: User }
];

// Mobile bottom nav — Home · Deploy Bot · Templates · Fake Website · Orders.
// Account bottom nav me nahi hai: uska profile button header me (naam ke saath) hai.
export const MOBILE_KEYS = ['home', 'deploy', 'templates', 'fakesite', 'orders'];

/** Mobile bottom nav — skillhub jaisa 5-tab bar (Home · Deploy Bot · Templates · Orders · Account). */
const MOBILE_NAV = MOBILE_KEYS
  .map((key) => NAV.find((n) => n.key === key))
  .filter(Boolean);

export function CoinIco({ size = 14 }) {
  return (
    <span className="coin-dot" style={{ width: size + 6, height: size + 6 }}>
      <span style={{ fontSize: size - 3, fontWeight: 900, lineHeight: 1 }}>₹</span>
    </span>
  );
}

/**
 * Brand mark — admin panel settings se aaya logo (config.logo_url) brand naam
 * ke aage dikhta hai; logo set na ho to brand naam ka first letter.
 */
export function Brand({ onClick }) {
  const { config } = useStore();
  const name = String(config?.site_name || 'ZAYRO BUILD').trim() || 'ZAYRO BUILD';
  const logo = config?.logo_url;
  return (
    <div className="brand" onClick={onClick}>
      <div className={`brand-logo${logo ? ' has-img' : ''}`}>
        {logo
          ? <img src={logo} alt="" />
          : <b>{name.charAt(0).toUpperCase()}</b>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="brand-name">{name}</div>
        <div className="brand-sub">Premium APK Marketplace</div>
      </div>
    </div>
  );
}

export function TopBar({ tab, setTab, user, orderCount, onAddFund, botLink }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand onClick={() => setTab('home')} />

        <nav className="desktop-nav">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key || (tab === 'wallet' && item.key === 'account');
            return (
              <button key={item.key} data-sfx="nav" className={active ? 'active' : ''} onClick={() => setTab(item.key)}>
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="topbar-spacer" />

        {user ? (
          <div className="topbar-user">
            <button className="balance-chip" data-sfx="coin" onClick={onAddFund} title="Wallet balance">
              <CoinIco />
              <span>₹{Number(user.coins || 0).toLocaleString('en-IN')}</span>
            </button>

            {/* Profile button — Telegram naam ke saath, click par account/profile view */}
            <button className={`profile-chip${tab === 'account' ? ' active' : ''}`} data-sfx="nav" onClick={() => setTab('account')} title="My profile">
              <span className="avatar-btn">
                {user.photo_url ? <img src={user.photo_url} alt="" /> : initials(displayName(user))}
              </span>
              <span className="profile-meta">
                <span className="profile-name">{displayName(user)}</span>
                <span className="profile-sub">My profile</span>
              </span>
              <ChevronRight size={14} className="profile-chev" />
            </button>
          </div>
        ) : (
          // Koi signup/login nahi — Telegram bot me le jaate hain.
          <button
            className="btn btn-gold btn-sm"
            onClick={() => { if (botLink) openTelegramLink(botLink); }}
            disabled={!botLink}
          >
            <Send size={14} />
            Telegram bot
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
          <button key={item.key} data-sfx="nav" className={active ? 'active' : ''} onClick={() => setTab(item.key)}>
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

export function Footer({ setTab }) {
  const { config } = useStore();
  const name = String(config?.site_name || 'ZAYRO BUILD').trim() || 'ZAYRO BUILD';
  return (
    <footer className="app-footer">
      <div className="flex-row gap-10" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('deploy')}><Bot size={13} />Deploy Bot</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('templates')}><Layers size={13} />Templates</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('wallet')}><Wallet size={13} />Wallet</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('refer')}><Gift size={13} />Refer &amp; Earn</button>
        <button className="btn btn-ghost btn-xs" onClick={() => setTab('fakesite')}><Radio size={13} />Fake Website</button>
      </div>
      <div className="app-footer-note">
        © {new Date().getFullYear()} {name} · Premium APK Marketplace · 100% Secure &amp; Fast
      </div>
    </footer>
  );
}
