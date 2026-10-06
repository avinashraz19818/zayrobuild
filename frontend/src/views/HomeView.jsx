import React, { useMemo, useState } from 'react';
import {
  Sparkles, Layers, Globe, Gift, Wallet, ShieldCheck, Zap, ArrowRight, Headphones,
  PackageCheck, BadgeCheck, Radio, Megaphone, Bot, Rocket, Coins, Timer, KeyRound,
  Smartphone, Users, TrendingUp, CircleDollarSign, Info
} from 'lucide-react';
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
          {logo ? <img src={logo} alt="" /> : <b>{name.charAt(0).toUpperCase()}</b>}
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 className="store-name">{name}</h2>
          <p className="store-tag">Premium APK Marketplace</p>
        </div>
      </div>
      <div className="store-badges">
        <span className="chip chip-ok"><ShieldCheck size={11} /> 100% Secure</span>
        <span className="chip chip-info"><Zap size={11} /> Fast delivery</span>
        <span className="chip chip-gold"><BadgeCheck size={11} /> Verified store</span>
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
          <img src={getMediaUrl(item.image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
  const { designs, orders, announcement, payment, loading, config, referral } = useStore();
  const { user } = useAuth();
  const [sort, setSort] = useState('latest');

  const topDesigns = useMemo(() => sortDesigns(designs, sort).slice(0, 8), [designs, sort]);
  const readyBuilds = orders.filter((o) => o.status === 'done').length;
  const building = orders.filter((o) => o.status === 'pending' || o.status === 'building').length;
  const rate = parseFloat(payment?.coin_rate) || 1;
  const coins = Number(user?.coins || 0);
  const fakeSites = orders.filter((o) => o.fake_apk_file || o.fake_register_url).length;

  const cheapest = useMemo(() => {
    const prices = (designs || []).map((d) => Number(d.price_coins || 0)).filter((n) => n > 0);
    return prices.length ? Math.min(...prices) : 0;
  }, [designs]);
  const totalBuilds = useMemo(
    () => (designs || []).reduce((sum, d) => sum + Number(d.orders_count || 0), 0),
    [designs]
  );

  const bonus = config?.referral_bonus ?? 10;
  const botLink = config?.bot_link || config?.support_url || '';
  const deployEnabled = config?.deploy_bot_enabled !== false;

  return (
    <>
      {/* 1 — Store banner */}
      <StoreBanner />

      {/* 2 — Announcement (bot message) */}
      <AnnouncementCard item={announcement} />

      {/* 3 — Hero */}
      <section className="hero">
        <span className="hero-eyebrow">
          <span className="live-dot" />
          {user ? 'Store live · instant builds' : 'Telegram bot se open karein'}
        </span>
        <h1 className="hero-title">
          {user ? `Welcome back, ${user.first_name || user.username || 'builder'}` : 'Premium APK Marketplace'}
        </h1>
        <p className="hero-text">
          Ready-made prediction templates, signed APK builds, fake website engine, welcome-message
          bots aur live link control — sab ek hi panel se. Koi coding nahi, koi waiting nahi.
        </p>

        <div className="hero-stats">
          <span className="hero-stat"><BadgeCheck size={15} color="var(--ok)" /> Signed &amp; Obfuscated</span>
          <span className="hero-stat"><Zap size={15} color="var(--gold)" /> Build in minutes</span>
          <span className="hero-stat"><ShieldCheck size={15} color="var(--info)" /> Dynamic live links</span>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => setTab('templates')}>
            <Layers size={15} /> Browse templates
          </button>
          <button className="btn btn-soft" onClick={() => (user ? setTab('orders') : openTelegramLink(botLink))}>
            <PackageCheck size={15} /> {user ? 'My orders' : 'Open in Telegram'}
          </button>
        </div>
      </section>

      {/* 4 — Balance / wallet summary */}
      <section className="balance-card">
        <div className="grow">
          <span className="label">Available balance</span>
          <div className="balance-value">
            ₹{coins.toLocaleString('en-IN')}
            <small>coins · ≈ ₹{(coins * rate).toLocaleString('en-IN')}</small>
          </div>
          <div className="balance-note">
            {user
              ? `1 coin = ₹${rate} · deposit approved in minutes`
              : 'Telegram bot se kholo — account apne aap ban jaata hai'}
          </div>
        </div>
        {user && (
          <button className="balance-link" onClick={() => setTab('wallet')}>
            <Wallet size={14} /> Wallet <ArrowRight size={13} />
          </button>
        )}
      </section>

      {/* 5 — Trust strip */}
      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span><b>Templates</b> · 100% secure &amp; fast delivery · auto build queue</span>
      </div>

      {/* 6 — Services (har service ek card) */}
      <section className="section">
        <SectionHead icon={Sparkles} title="Our services" sub="Jo bhi chahiye — ek jagah" />
        <div className="service-grid">
          <ServiceCard
            icon={Layers}
            title="APK Templates"
            text="Prediction apps, ready templates"
            meta={cheapest ? `from ${cheapest} coins` : `${designs.length} templates`}
            onClick={() => setTab('templates')}
          />
          <ServiceCard
            icon={Globe}
            title="Fake Website"
            text="Backup site + fake APK build"
            meta={user ? `${fakeSites} aapke fake builds` : 'Primary + fake combo'}
            tone="info"
            onClick={() => setTab('fakesite')}
          />
          <ServiceCard
            icon={Bot}
            title="Deploy Bot"
            text="Welcome-message bot 24×7 live"
            meta="from ₹699"
            tone="gold"
            badge={deployEnabled ? 'Live' : 'Soon'}
            onClick={() => setTab('deploy')}
          />
          <ServiceCard
            icon={Gift}
            title="Refer & Earn"
            text="Dost ko bulao, coins pao"
            meta={`+${bonus} coins per invite`}
            tone="ok"
            onClick={() => setTab('refer')}
          />
        </div>
      </section>

      {/* 7 — Quick actions */}
      <section className="section">
        <SectionHead icon={Zap} title="Quick actions" sub="Jo chahiye, ek tap me" />
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))' }}>
          <QuickAction icon={Sparkles} title="Build APK" text="Template pick karo, app ready" onClick={() => setTab('templates')} />
          <QuickAction icon={Globe} title="Fake website" text="Backup / test build banao" tone="info" onClick={() => setTab('fakesite')} />
          <QuickAction icon={Wallet} title="Wallet" text="Balance + deposit history" tone="ok" onClick={() => setTab('wallet')} />
          <QuickAction icon={PackageCheck} title="My orders" text="Downloads + build logs" onClick={() => setTab('orders')} />
        </div>
      </section>

      {/* 8 — How it works */}
      <section className="section">
        <SectionHead icon={Rocket} title="How it works" sub="3 easy steps — 5 minute me APK" />
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-num">1</span>
            <KeyRound size={18} />
            <b>Template choose karein</b>
            <span>App name, icon aur register link daalein.</span>
          </div>
          <div className="step-card">
            <span className="step-num">2</span>
            <Coins size={18} />
            <b>Coins se pay karein</b>
            <span>UPI se wallet top-up, coins turant credit.</span>
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
          <Stat value={orders.length} label="Total orders" />
          <Stat value={readyBuilds} label="Ready APKs" />
          <Stat value={building} label="In queue" />
          <Stat value={coins} label="Coins" />
        </div>
      </section>

      {/* 10 — Templates */}
      <section className="section">
        <SectionHead
          icon={Layers}
          title="Available Templates"
          sub={`${designs.length} live template${designs.length === 1 ? '' : 's'} · ${totalBuilds} builds done`}
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
          <div className="tpl-grid tpl-scroll">
            {topDesigns.slice(0, 8).map((design, i) => (
              <TemplateCard key={design.id} design={design} index={i} onOpen={onOpenDesign} onPreview={onPreview} />
            ))}
          </div>
        )}
      </section>

      {/* 11 — Why choose us */}
      <section className="section">
        <SectionHead icon={ShieldCheck} title="Why choose us" sub="Store ka bharosa" />
        <div className="feature-grid">
          <div className="feature-card">
            <span className="row-ico ok"><ShieldCheck size={17} /></span>
            <b>100% Secure</b>
            <span>Clean builds, antivirus-safe signed APKs.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico info"><Timer size={17} /></span>
            <b>Fast Delivery</b>
            <span>Auto build queue — minutes me ready.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico gold"><CircleDollarSign size={17} /></span>
            <b>Coins Wallet</b>
            <span>UPI deposit, instant coin credit.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico"><Headphones size={17} /></span>
            <b>24×7 Support</b>
            <span>Telegram par direct admin support.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico info"><Radio size={17} /></span>
            <b>Dynamic Links</b>
            <span>Live links kabhi band nahi padte.</span>
          </div>
          <div className="feature-card">
            <span className="row-ico gold"><Users size={17} /></span>
            <b>Refer &amp; Earn</b>
            <span>Har invite par +{bonus} coins.</span>
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
                  <span className="row-sub truncate">{o.design_name || 'Template'} · {fmtDate(o.created_at)}</span>
                </span>
                <StatusPill status={o.status} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 13 — Refer promo */}
      <section className="promo-card rise-in">
        <span className="promo-ico"><Gift size={20} /></span>
        <div className="grow">
          <div className="promo-title">Refer &amp; Earn — +{bonus} coins</div>
          <p className="promo-text">
            Apna invite link dost ko bhejein. Wo Telegram bot join karke register karega to aapko
            {referral?.earned_coins ? ` (ab tak ${referral.earned_coins} coins kamaye)` : ` ${bonus} coins`} milenge.
          </p>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => setTab('refer')}>
          Invite <ArrowRight size={13} />
        </button>
      </section>

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
          1 coin = ₹{rate} · Coin rate aur prices admin panel se manage hote hain.
          {totalBuilds > 0 && ` Ab tak ${totalBuilds} APKs is store se bane hain.`}
        </span>
      </div>
    </>
  );
}
