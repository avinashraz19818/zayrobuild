import React, { useMemo, useState } from 'react';
import {PackageCheck, BadgeCheck, Radio, Megaphone, Rocket, IndianRupee as Coins, Timer, KeyRound, Users, TrendingUp, CircleDollarSign, Info} from 'lucide-react';
import {Sparkles, Globe, Gift, Wallet, Bot, Layers, ShieldCheck, Zap, ArrowRight, Headphones, Smartphone} from '../components/AnimatedIcon';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { SectionHead, Stat, Loader, EmptyState, StatusPill } from '../components/ui';
import TemplateCard from '../components/TemplateCard';
import { SORTS, sortDesigns } from '../lib/catalog';
import { fmtDate, openTelegramLink } from '../lib/api';
import { getMediaUrl } from '../utils/media';

/* ─────────────────────────  Store banner (skillhub top.png jaisa)  ───────────────────────── */
function StoreBanner() {
  const { config } = useStore();
  const name = String(config?.site_name || 'ZAYRO BUILD').trim() || 'ZAYRO BUILD';
  const logo = config?.logo_url;
  return (
    <section className="store-banner rise-in">
      <span className="store-banner-orb a" aria-hidden="true" />
      <span className="store-banner-orb b" aria-hidden="true" />
      <div className="store-banner-main">
        <span className={`store-logo${logo ? ' has-img' : ''}`}>
          {logo ? <img src={logo} alt="" decoding="async" /> : <b>{name.charAt(0).toUpperCase()}</b>}
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 className="store-name">{name}</h2>
          <p className="store-tag">Premium APK Marketplace</p>
        </div>
      </div>
      <div className="store-badges">
        <span className="chip chip-ok"><ShieldCheck size={11} /> Wallet payments</span>
        <span className="chip chip-info"><Zap size={11} /> Order tracking</span>
        <span className="chip chip-gold"><BadgeCheck size={11} /> Telegram access</span>
      </div>
    </section>
  );
}

/* ─────────────────────────  Announcement ticker  ───────────────────────── */
function AnnouncementCard({ item }) {
  if (!item) return null;
  return (
    <div className="announce rise-in">
      <div className="announce-ico" style={{ overflow: 'hidden' }}>
        {item.image_url ? (
          <img src={getMediaUrl(item.image_url)} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Megaphone size={17} />
        )}
      </div>
      <div className="announce-body grow">
        <div className="announce-head">
          <span className="truncate">{item.title || 'Update'}</span>
          <span className="tag">Bot message</span>
        </div>
        <p className="announce-text clamp-2">{item.message}</p>
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

/* ─────────────────────────  Service cards (Templates / Fake / Deploy)  ───────────────────────── */
function ServiceCard({ icon: Icon, title, text, meta, tone = '', onClick, badge }) {
  return (
    <button className="service-card" onClick={onClick}>
      <span className={`row-ico ${tone}`} style={{ width: 42, height: 42, borderRadius: 14 }}><Icon size={19} /></span>
      <span className="service-body">
        <span className="service-title">{title}</span>
        <span className="service-text">{text}</span>
        {meta && <span className="service-meta">{meta}</span>}
      </span>
      {badge ? <span className="chip chip-gold service-badge">{badge}</span> : <ArrowRight size={15} className="service-arrow" />}
    </button>
  );
}

/* ─────────────────────────  Quick action tile  ───────────────────────── */
function QuickAction({ icon: Icon, title, text, tone, onClick }) {
  return (
    <button className="card card-pad card-hover" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }} onClick={onClick}>
      <span className={`row-ico ${tone || ''}`}><Icon size={18} /></span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{title}</span>
      <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>{text}</span>
    </button>
  );
}

/* ─────────────────────────  Home  ───────────────────────── */
export default function HomeView({ setTab, onOpenDesign, onPreview, onAddFund }) {
  const { designs, orders, announcement, payment, loading, config } = useStore();
  const { user } = useAuth();
  const [sort, setSort] = useState('latest');

  const topDesigns = useMemo(() => sortDesigns(designs, sort).slice(0, 8), [designs, sort]);
  const readyBuilds = orders.filter((o) => o.status === 'done').length;
  const building = orders.filter((o) => o.status === 'pending' || o.status === 'building').length;
  const coins = Number(user?.coins || 0);

  const cheapest = useMemo(() => {
    const prices = (designs || []).map((d) => Number(d.price_coins || 0)).filter((n) => n > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [designs]);
  const totalBuilds = useMemo(
    () => (designs || []).reduce((sum, d) => sum + Number(d.orders_count || 0), 0),
    [designs]
  );

  const botLink = config?.bot_link || config?.support_url || '';
  const deployEnabled = config?.deploy_bot_enabled !== false;

  return (
    <div className="home-premium">
      {/* 1 — Store banner */}
      <StoreBanner />

      {/* 2 — Announcement (bot message) */}
      <AnnouncementCard item={announcement} />

      <div className="home-welcome"><span className="hero-eyebrow"><span className="live-dot"/> YOUR DIGITAL WORKSPACE</span><h1>{user?`Hey, ${user.first_name||user.username||'builder'}`:'Build something yours.'}<span>Let’s create.</span></h1><p>Hacks, website accounts & Telegram bots — one store.</p></div>
      {/* 4 — Balance / wallet summary */}
      <section className="balance-card premium-wallet">
        <div className="grow">
          <span className="label">YOUR BALANCE</span>
          <div className="balance-value">
            <Coins size={27} aria-label="Rupees"/><span>{coins.toLocaleString('en-IN')}</span>
          </div>
          <div className="balance-note">
            {user
              ? 'Pay directly from your ₹ wallet'
              : 'Telegram bot se kholo — account apne aap ban jaata hai'}
          </div>
        </div>
        {user && (
          <button className="wallet-fund-btn" onClick={() => setTab('wallet')}>
            <span className="wallet-fund-icon"><Wallet size={23}/></span> ADD FUND <span className="fund-action-hint" aria-hidden="true"><ArrowRight size={16}/><span className="fund-tap-ring"/></span>
          </button>
        )}
      </section>

      {/* 5 — Trust strip */}
      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span><b>{designs.length} Hacks</b> · Wallet payments · Build tracking</span>
      </div>

      {/* Hacks catalog */}
      <section className="section">
        <SectionHead
          icon={Layers}
          title="Available Hacks"
          sub={`${designs.length} live hack${designs.length === 1 ? '' : 's'} · ${totalBuilds} builds done`}
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
          <Loader label="Loading hacks…" />
        ) : topDesigns.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No hacks live yet"
            text="Admin ne abhi koi hack publish nahi kiya. Thodi der me check karein."
          />
        ) : (
          <div className="tpl-grid tpl-scroll">
            {topDesigns.slice(0, 8).map((design, i) => (
              <TemplateCard key={design.id} design={design} index={i} onOpen={onOpenDesign} onPreview={onPreview} />
            ))}
          </div>
        )}
      </section>

      {/* 6 — Services (har service ek card) */}
      <section className="section">
        <SectionHead icon={Sparkles} title="Our services" sub="Jo bhi chahiye — ek jagah" />
        <div className="service-grid">
          <ServiceCard
            icon={Layers}
            title="APK Hacks"
            text="Prediction apps, ready hacks"
            meta={cheapest ? `from ₹${cheapest}` : `${designs.length} hacks`}
            onClick={() => setTab('templates')}
          />
          <ServiceCard
            icon={Globe}
            title="Fake Website"
            text="Ready accounts with flexible validity"
            meta="Choose a plan · Get your login"
            tone="info"
            onClick={() => setTab('fakesite')}
          />
          <ServiceCard
            icon={Bot}
            title="Deploy Bot"
            text="Welcome messages, channels & broadcasts"
            meta="Choose your plan"
            tone="gold"
            badge={deployEnabled ? 'Explore' : 'Soon'}
            onClick={() => setTab('deploy')}
          />
          <ServiceCard
            icon={Gift}
            title="Refer & Earn"
            text="Referral rewards are coming soon"
            meta="Coming Soon"
            tone="ok"
            onClick={() => setTab('refer')}
          />
        </div>
      </section>

      {/* 7 — Quick actions */}
      <section className="section">
        <SectionHead icon={Zap} title="Quick actions" sub="Jo chahiye, ek tap me" />
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))' }}>
          <QuickAction icon={Sparkles} title="Build APK" text="Hack pick karo, app ready" onClick={() => setTab('templates')} />
          <QuickAction icon={Globe} title="Fake website" text="Website accounts aur renewal" tone="info" onClick={() => setTab('fakesite')} />
          <QuickAction icon={Wallet} title="Wallet" text="Balance + deposit history" tone="ok" onClick={() => setTab('wallet')} />
          <QuickAction icon={PackageCheck} title="My orders" text="Downloads + build progress" onClick={() => setTab('orders')} />
        </div>
      </section>

      {/* 8 — How it works */}
      <section className="section">
        <SectionHead icon={Rocket} title="How it works" sub="3 easy steps — 5 minute me APK" />
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-num">1</span>
            <KeyRound size={18} />
            <b>Hack choose karein</b>
            <span>App name, icon aur register link daalein.</span>
          </div>
          <div className="step-card">
            <span className="step-num">2</span>
            <Coins size={18} />
            <b>₹ wallet se pay karein</b>
            <span>UPI se wallet top-up, approval ke baad credit.</span>
          </div>
          <div className="step-card">
            <span className="step-num">3</span>
            <Smartphone size={18} />
            <b>Signed APK download</b>
            <span>Build queue se ready hote hi download link.</span>
          </div>
        </div>
      </section>

      {/* 9 — Activity stats */}
      <section className="section">
        <SectionHead
          icon={TrendingUp}
          title="Your activity"
          sub={user ? 'Live build queue status' : 'Telegram bot se login karne par aapke stats yahan dikhenge'}
        />
        <div className="stat-grid">
          <Stat value={orders.length} label="APK orders" />
          <Stat value={readyBuilds} label="Ready APKs" />
          <Stat value={building} label="In queue" />
          <Stat value={`₹${coins}`} label="Wallet" />
        </div>
      </section>

      {/* 11 — Why choose us */}
      <section className="section">
        <SectionHead icon={ShieldCheck} title="Why choose us" sub="Store ka bharosa" />
        <div className="feature-grid">
          <div className="feature-card">
            <span className="row-ico ok"><ShieldCheck size={17} /></span>
            <b>Build tracking</b>
            <span>Follow your APK build progress and downloads.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico info"><Timer size={17} /></span>
            <b>Fast Delivery</b>
            <span>Auto build queue — minutes me ready.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico gold"><CircleDollarSign size={17} /></span>
            <b>₹ Wallet</b>
            <span>UPI deposit aur wallet payments.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico"><Headphones size={17} /></span>
            <b>24×7 Support</b>
            <span>Telegram par direct admin support.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico info"><Radio size={17} /></span>
            <b>Update link</b>
            <span>Live links kabhi band nahi padte.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico gold"><Users size={17} /></span>
            <b>Refer &amp; Earn</b>
            <span>Coming Soon</span>
          </div>
        </div>
      </section>

      {/* 12 — Recent builds */}
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
                  <span className="row-sub truncate">{o.design_name || 'Hack'} · {fmtDate(o.created_at)}</span>
                </span>
                <StatusPill status={o.status} />
              </button>
            ))}
          </div>
        </section>
      )}



      {/* 14 — Support */}
      <section className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="row-ico info"><Headphones size={17} /></span>
        <span className="grow">
          <span className="row-title">Need help?</span>
          <span className="row-sub">Payment issue, build delay ya custom requirement — support 24×7.</span>
        </span>
        <button
          className="btn btn-soft btn-sm"
          onClick={() => {
            if (config?.support_url) openTelegramLink(config.support_url);
            else setTab('account');
          }}
        >
          Chat
        </button>
      </section>

      {/* 15 — Small print: price note + admin */}
      <div className="home-note">
        <Info size={12} />
        <span>
          Prices aur payments Indian rupees (₹) mein hain.
          {totalBuilds > 0 && ` Ab tak ${totalBuilds} APKs is store se bane hain.`}
        </span>
      </div>
    </div>
  );
}
