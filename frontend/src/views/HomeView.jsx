import React, { useMemo, useState } from 'react';
import {
  Sparkles, Layers, Globe, Gift, Wallet, ShieldCheck, Zap, ArrowRight, Headphones,
  PackageCheck, TrendingUp, BadgeCheck, Radio, Megaphone
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { SectionHead, Stat, Loader, EmptyState, StatusPill } from '../components/ui';
import TemplateCard from '../components/TemplateCard';
import { SORTS, sortDesigns } from '../lib/catalog';
import { fmtDate, openTelegramLink } from '../lib/api';
import { getMediaUrl } from '../utils/media';

function AnnouncementCard({ item }) {
  if (!item) return null;
  return (
    <div className="announce rise-in">
      <div className="announce-ico" style={{ overflow: 'hidden' }}>
        {item.image_url ? (
          <img src={getMediaUrl(item.image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Megaphone size={17} />
        )}
      </div>
      <div className="announce-body grow">
        <div className="announce-head">
          <span>{item.title || 'Update'}</span>
          <span className="tag">Bot message</span>
        </div>
        <p className="announce-text">{item.message}</p>
        {item.button_text && item.button_url && (
          <a
            className="btn btn-outline btn-xs"
            style={{ marginTop: 9 }}
            href={item.button_url}
            onClick={(e) => { e.preventDefault(); openTelegramLink(item.button_url); }}
          >
            {item.button_text}
            <ArrowRight size={12} />
          </a>
        )}
        <div className="announce-time">{fmtDate(item.created_at)}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, text, tone, onClick }) {
  return (
    <button className="card card-pad card-hover" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={onClick}>
      <span className={`row-ico ${tone || ''}`}><Icon size={18} /></span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{title}</span>
      <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>{text}</span>
    </button>
  );
}

export default function HomeView({ setTab, onOpenDesign, onPreview, onAddFund }) {
  const { designs, orders, announcement, payment, loading } = useStore();
  const { user, isAdmin, openAuth } = useAuth();
  const [sort, setSort] = useState('latest');

  const topDesigns = useMemo(() => sortDesigns(designs, sort).slice(0, 8), [designs, sort]);
  const readyBuilds = orders.filter((o) => o.status === 'done').length;
  const building = orders.filter((o) => o.status === 'pending' || o.status === 'building').length;
  const rate = parseFloat(payment?.coin_rate) || 1;
  const coins = Number(user?.coins || 0);

  return (
    <>
      <AnnouncementCard item={announcement} />

      {/* Hero */}
      <section className="hero">
        <span className="hero-eyebrow">
          <span className="live-dot" />
          Store live · instant builds
        </span>
        <h1 className="hero-title">
          {user ? `Welcome back, ${user.first_name || user.username || 'builder'}` : 'Premium APK Marketplace'}
        </h1>
        <p className="hero-text">
          Ready-made prediction templates, signed APK builds, fake website engine aur live link
          control — sab ek hi panel se. Koi coding nahi, koi waiting nahi.
        </p>

        <div className="hero-stats">
          <span className="hero-stat"><BadgeCheck size={15} color="var(--ok)" /> Signed &amp; Obfuscated APKs</span>
          <span className="hero-stat"><Zap size={15} color="var(--gold)" /> Build in minutes</span>
          <span className="hero-stat"><ShieldCheck size={15} color="var(--info)" /> Dynamic Firebase links</span>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => setTab('templates')}>
            <Layers size={15} />
            Browse templates
          </button>
          <button className="btn btn-soft" onClick={() => (user ? setTab('orders') : openAuth('login'))}>
            <PackageCheck size={15} />
            {user ? 'My orders' : 'Sign in'}
          </button>
        </div>
      </section>

      {/* Balance + Add fund */}
      <section className="balance-card">
        <div>
          <span className="label">Available balance</span>
          <div className="balance-value">
            ₹{coins.toLocaleString('en-IN')}
            <small>coins · ≈ ₹{(coins * rate).toLocaleString('en-IN')}</small>
          </div>
          <div className="balance-note">
            {user ? '1 coin = ₹' + rate + ' · deposit approved in minutes' : 'Sign in to load wallet & build apps'}
          </div>
        </div>
        <button className="btn btn-gold" onClick={user ? onAddFund : () => openAuth('login')}>
          <Wallet size={15} />
          Add fund
        </button>
      </section>

      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span><b>Templates</b> · 100% secure &amp; fast delivery · auto build queue</span>
      </div>

      {/* Quick actions */}
      <section className="section">
        <SectionHead icon={Zap} title="Quick actions" sub="Jo chahiye, ek tap me" />
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))' }}>
          <QuickAction icon={Sparkles} title="Build APK" text="Template pick karo, app ready" onClick={() => setTab('templates')} />
          <QuickAction icon={Globe} title="Fake website" text="Backup / test build banao" tone="info" onClick={() => setTab('fakesite')} />
          <QuickAction icon={Gift} title="Refer & earn" text="Dost ko bulao, coins pao" tone="gold" onClick={() => setTab('refer')} />
          <QuickAction icon={Wallet} title="Add fund" text="UPI se wallet top-up" tone="ok" onClick={user ? onAddFund : () => openAuth('login')} />
        </div>
      </section>

      {/* Stats (sirf logged-in users ke liye) */}
      {user && (
        <section className="section">
          <SectionHead icon={TrendingUp} title="Your activity" sub="Live build queue status" />
          <div className="stat-grid">
            <Stat value={orders.length} label="Total orders" />
            <Stat value={readyBuilds} label="Ready APKs" />
            <Stat value={building} label="In queue" />
            <Stat value={coins} label="Coins" />
          </div>
        </section>
      )}

      {/* Templates */}
      <section className="section">
        <SectionHead
          icon={Layers}
          title="Available Templates"
          sub={`${designs.length} live template${designs.length === 1 ? '' : 's'} · updated daily`}
          action={
            <button className="btn btn-soft btn-xs" onClick={() => setTab('templates')}>
              View all <ArrowRight size={12} />
            </button>
          }
        />
        <div className="pill-row">
          {SORTS.map((s) => (
            <button key={s.key} className={`pill ${sort === s.key ? 'active' : ''}`} onClick={() => setSort(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader label="Loading templates…" />
        ) : topDesigns.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No templates live yet"
            text="Admin ne abhi koi template publish nahi kiya. Thodi der me check karein."
          />
        ) : (
          <div className="tpl-grid">
            {topDesigns.map((design, i) => (
              <TemplateCard key={design.id} design={design} index={i} onOpen={onOpenDesign} onPreview={onPreview} />
            ))}
          </div>
        )}
      </section>

      {/* Recent orders */}
      {user && orders.length > 0 && (
        <section className="section">
          <SectionHead
            icon={PackageCheck}
            title="Recent builds"
            action={<button className="btn btn-ghost btn-xs" onClick={() => setTab('orders')}>All orders <ArrowRight size={12} /></button>}
          />
          <div className="stack gap-8">
            {orders.slice(0, 3).map((o) => (
              <button key={o.id} className="row-item" onClick={() => setTab('orders')}>
                <span className="row-ico"><Radio size={16} /></span>
                <span className="row-main">
                  <span className="row-title truncate">{o.app_name}</span>
                  <span className="row-sub truncate">{o.design_name || 'Template'} · {fmtDate(o.created_at)}</span>
                </span>
                <StatusPill status={o.status} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Support */}
      <section className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="row-ico info"><Headphones size={17} /></span>
        <span className="grow">
          <span className="row-title">Need help?</span>
          <span className="row-sub">Payment issue, build delay ya custom requirement — support 24×7.</span>
        </span>
        <button
          className="btn btn-soft btn-sm"
          onClick={() => {
            const url = config?.support_url;
            if (url) openTelegramLink(url);
            else setTab('account');
          }}
        >
          Chat
        </button>
      </section>

      {isAdmin && (
        <button className="btn btn-outline btn-block" onClick={() => setTab('admin')}>
          <ShieldCheck size={15} /> Open admin panel
        </button>
      )}
    </>
  );
}
