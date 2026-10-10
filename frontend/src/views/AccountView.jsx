import React, { useState } from 'react';
import {LogOut, ChevronRight, BadgeCheck, Send, Activity, Ticket} from 'lucide-react';
import {User, Wallet, Package, Gift, Globe, Sparkles, Headphones, ShieldCheck, Layers} from '../components/AnimatedIcon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { EmptyState, SectionHead, Stat } from '../components/ui';
import { displayName, initials, openTelegramLink, fmtDay } from '../lib/api';
import TelegramGate from '../components/TelegramGate';
import GiftCodeSheet from '../components/GiftCodeSheet';

function MenuRow({ icon: Icon, tone, title, sub, trail, onClick }) {
  return (
    <button className="row-item" onClick={onClick}>
      <span className={`row-ico ${tone || ''}`}><Icon size={17} /></span>
      <span className="row-main">
        <span className="row-title">{title}</span>
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      <span className="row-trail">
        {trail}
        <ChevronRight size={16} />
      </span>
    </button>
  );
}

export default function AccountView({ setTab, onAddFund }) {
  const { user, logout, refreshUser, telegramUser } = useAuth();
  const { orders, referral, config } = useStore();
  const [giftOpen, setGiftOpen] = useState(false);
  if (!user) {
    return <TelegramGate botLink={config?.bot_link} />;
  }

  const name = displayName(user);
  const readyBuilds = orders.filter((o) => o.status === 'done').length;
  const inQueue = orders.filter((o) => o.status === 'pending' || o.status === 'building').length;

  return (
    <>
      {/* Profile card */}
      <section className="hero" style={{ padding: 16 }}>
        <div className="flex-row gap-12">
          <span className="avatar-btn" style={{ width: 62, height: 62, fontSize: 20 }}>
            {user.photo_url ? <img src={user.photo_url} alt="" /> : initials(name)}
          </span>
          <div className="grow" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }} className="truncate">{name}</div>
            <div className="row-sub truncate">
              {user.tg_username ? `@${user.tg_username}` : user.username}
              {user.telegram_id ? ` · ID ${user.telegram_id}` : ''}
            </div>
            <div className="flex-row gap-6" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <span className="chip chip-ok"><BadgeCheck size={11} /> {user.is_telegram ? 'Telegram verified' : 'Account active'}</span>
              {user.created_at && <span className="chip">Since {fmtDay(user.created_at)}</span>}
            </div>
          </div>
        </div>

        <div className="balance-card" style={{ marginTop: 16 }}>
          <div>
            <span className="label">Wallet balance</span>
            <div className="balance-value">₹{Number(user.coins || 0).toLocaleString('en-IN')}</div>
          </div>
          <button className="btn btn-gold" onClick={onAddFund}><Wallet size={15} /> Add fund</button>
        </div>
      </section>

      {/* Gift code — claim karne par coins seedha isi account me */}
      <button className="gift-cta rise-in" onClick={() => setGiftOpen(true)}>
        <span className="gift-cta-ico"><Gift size={20} /></span>
        <span className="grow" style={{ textAlign: 'left' }}>
          <span className="gift-cta-title">Gift Code</span>
          <span className="gift-cta-sub">Code paste karein aur balance claim karein</span>
        </span>
        <span className="gift-cta-btn"><Ticket size={14} /> Claim</span>
      </button>

      <section className="section">
        <SectionHead icon={Activity} title="Account stats" />
        <div className="stat-grid">
          <Stat value={orders.length} label="Orders" />
          <Stat value={readyBuilds} label="Ready APKs" />
          <Stat value={inQueue} label="In queue" />
          <Stat value={referral?.invited_count ?? 0} label="Referrals" />
        </div>
      </section>

      <section className="section">
        <SectionHead icon={Sparkles} title="My store" />
        <div className="stack gap-8">
          <MenuRow icon={ShieldCheck} tone="info" title="Reseller panel" sub="Partner rates, daily reports & wallet records" onClick={() => setTab('reseller')} />
          <MenuRow icon={Layers} tone="info" title="Hacks" sub="Naye designs & live hacks" onClick={() => setTab('templates')} />
          <MenuRow icon={Package} tone="ok" title="My orders" sub={`${orders.length} orders · ${readyBuilds} ready`} onClick={() => setTab('orders')} />
          <MenuRow icon={Globe} title="Fake website engine" sub="Backup builds & extra fake APKs" onClick={() => setTab('fakesite')} />
          <MenuRow
            icon={Gift}
            tone="gold"
            title="Refer & earn"
            sub="Coming Soon — abhi available nahi hai"
            trail={<span className="chip">Soon</span>}
            onClick={() => setTab('refer')}
          />
          <MenuRow
            icon={Gift}
            tone="gold"
            title="Gift code"
            sub="Code redeem karke balance paayein"
            onClick={() => setGiftOpen(true)}
          />
          <MenuRow icon={Wallet} tone="ok" title="Wallet & deposits" sub="UPI top-up + deposit history" onClick={onAddFund} />
        </div>
      </section>

      <section className="section">
        <SectionHead icon={ShieldCheck} title="Support & admin" />
        <div className="stack gap-8">
          <MenuRow
            icon={Headphones}
            tone="info"
            title="Customer support"
            sub="Payment ya build issue? Direct message karein"
            onClick={() => {
              const url = config?.support_url || window.__ZAYRO_CONFIG__?.support_url;
              if (url) openTelegramLink(url);
            }}
          />
          {config?.channel_url && (
            <MenuRow
              icon={Send}
              title="Updates channel"
              sub="Naye hacks & offers ki updates"
              onClick={() => openTelegramLink(config.channel_url)}
            />
          )}
          <MenuRow
            icon={LogOut}
            tone="danger"
            title="Logout"
            sub={telegramUser ? 'Telegram se dobara open karne par auto-login hoga' : 'Session band karein'}
            onClick={async () => { await logout(); setTab?.('home'); }}
          />
        </div>
      </section>

      <div className="center-pad" style={{ paddingTop: 4 }}>
        <span>{config?.site_name || 'ZAYRO BUILD'} · panel v3 · <button className="btn btn-ghost btn-xs" onClick={refreshUser}>refresh</button></span>
      </div>

      <GiftCodeSheet open={giftOpen} onClose={() => setGiftOpen(false)} />
    </>
  );
}
