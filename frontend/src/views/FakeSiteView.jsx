import React from 'react';
import {
  Globe, Download, ShieldCheck, Sparkles, ArrowRight, Layers, Radio, Lock, RefreshCw, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { EmptyState, Loader, SectionHead, StatusPill } from '../components/ui';
import { fmtDate } from '../lib/api';
import TelegramGate from '../components/TelegramGate';

export default function FakeSiteView({ setTab, onOpenDesign }) {
  const { user, openAuth } = useAuth();
  const { fakeSites, designs, loading, refreshFakeSites, config } = useStore();

  if (!user) {
    return <TelegramGate botLink={config?.bot_link} />;
  }

  const fakeReadyTemplates = designs.filter((d) => Number(d.fake_price_coins || 0) >= 0).slice(0, 3);

  return (
    <>
      <SectionHead
        icon={Globe}
        title="Fake Website"
        sub="Backup / test builds — alag register link, alag APK"
        action={<button className="btn btn-soft btn-sm" onClick={() => refreshFakeSites()}><RefreshCw size={13} />Refresh</button>}
      />

      <section className="hero" style={{ padding: 16 }}>
        <span className="hero-eyebrow"><Sparkles size={13} /> Extra safety layer</span>
        <h2 className="hero-title" style={{ fontSize: 22 }}>Ek order, do APK</h2>
        <p className="hero-text">
          Har order ke saath ek fake build bhi ban sakta hai — alag register link aur alag firebase path.
          Main app ke fail hone par fake APK ko primary link ki tarah use karein.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => setTab('templates')}>
            <Layers size={15} /> New build with fake
          </button>
          <button className="btn btn-soft" onClick={() => setTab('orders')}>
            <Radio size={15} /> My orders
          </button>
        </div>
      </section>

      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span><b>Safe swap</b> · fake build ka firebase alag hota hai, isliye data mix nahi hota</span>
      </div>

      <section className="section">
        <SectionHead icon={Globe} title="My fake builds" sub={`${fakeSites.length} fake site${fakeSites.length === 1 ? '' : 's'} generated`} />
        {loading ? (
          <Loader label="Fake builds load ho rahe hain…" />
        ) : fakeSites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Abhi koi fake build nahi"
            text="Order banate waqt 'Fake website bhi banao' option select karein — build hone par yahan download milega."
            action={<button className="btn btn-soft btn-sm" onClick={() => setTab('templates')}>Choose a template</button>}
          />
        ) : (
          <div className="stack gap-12">
            {fakeSites.map((site) => (
              <article key={`${site.order_id}-${site.id || 'primary'}`} className="card card-pad stack gap-10">
                <div className="flex-row gap-10">
                  <span className="row-ico info" style={{ width: 44, height: 44, borderRadius: 14 }}><Globe size={19} /></span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="flex-row gap-8 wrap">
                      <strong style={{ fontSize: 14.5, fontWeight: 800 }}>{site.app_name || `Order #${site.order_id}`}</strong>
                      <StatusPill status={site.status || (site.apk_file ? 'done' : 'pending')} />
                    </div>
                    <div className="row-sub truncate">Order #{site.order_id} · {fmtDate(site.created_at)}</div>
                    {site.register_url && (
                      <div className="row-sub truncate mono" style={{ fontSize: 11 }}>{site.register_url}</div>
                    )}
                  </div>
                </div>
                <div className="btn-group">
                  {site.apk_file ? (
                    <a className="btn btn-primary btn-sm" href={`/api/orders/${site.order_id}/download-fake`} download>
                      <Download size={14} /> Download fake APK
                    </a>
                  ) : (
                    <span className="chip chip-warn"><Info size={12} /> APK ban raha hai…</span>
                  )}
                  <button className="btn btn-soft btn-sm" onClick={() => setTab('orders')}>
                    Open order <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <SectionHead icon={Layers} title="Fake-ready templates" sub="In templates ke saath fake build option available hai" />
        {fakeReadyTemplates.length > 0 && (
          <div className="stack gap-8">
            {fakeReadyTemplates.map((d) => (
              <button key={d.id} className="row-item" onClick={() => onOpenDesign?.(d)}>
                <span className="row-ico"><Globe size={16} /></span>
                <span className="row-main">
                  <span className="row-title truncate">{d.name}</span>
                  <span className="row-sub">Real {d.price_coins} coins · Fake {d.fake_price_coins ?? '—'} coins</span>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
