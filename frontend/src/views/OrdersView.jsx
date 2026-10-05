import React, { useMemo, useState } from 'react';
import { Box, Download, Globe, Layers, Lock, Package, Radio, RefreshCw, ShieldCheck, Terminal, Users } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader, SectionHead, StatusPill } from '../components/ui';
import { fmtDate } from '../lib/api';
import { getMediaUrl } from '../utils/media';
import TelegramGate from '../components/TelegramGate';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Ready' },
  { key: 'building', label: 'Building' },
  { key: 'failed', label: 'Failed' }
];

export default function OrdersView({ onOpenLogs, onOpenLiveLinks, onOpenDemoUsers, setTab }) {
  const { orders, loading, refreshOrders, config } = useStore();
  const { user, openAuth } = useAuth();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'building') return orders.filter((o) => o.status === 'pending' || o.status === 'building');
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  if (!user) {
    return <TelegramGate botLink={config?.bot_link} />;
  }

  const reload = async () => {
    setBusy(true);
    await refreshOrders();
    setBusy(false);
  };

  return (
    <>
      <SectionHead
        icon={Package}
        title="My Orders"
        sub="Build status, live logs aur APK downloads — sab yahan"
        action={
          <button className="btn btn-soft btn-sm" onClick={reload} disabled={busy}>
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <div className="pill-row">
        {FILTERS.map((f) => (
          <button key={f.key} className={`pill ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key !== 'all' && (
              <span style={{ opacity: 0.75 }}>
                {f.key === 'building'
                  ? orders.filter((o) => o.status === 'pending' || o.status === 'building').length
                  : orders.filter((o) => o.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Orders load ho rahe hain…" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Box}
          title={orders.length === 0 ? 'Abhi koi build nahi hai' : 'Is filter me kuch nahi'}
          text={orders.length === 0
            ? 'Ek template choose karke apna pehla signed APK banayein — build queue me chala jaata hai.'
            : 'Doosra filter try karein.'}
          action={orders.length === 0
            ? <button className="btn btn-primary" onClick={() => setTab('templates')}><Layers size={14} />Browse templates</button>
            : null}
        />
      ) : (
        <div className="stack gap-12">
          {visible.map((order) => (
            <article key={order.id} className="card card-pad stack gap-12">
              <div className="flex-row gap-12" style={{ alignItems: 'flex-start' }}>
                <span className="row-ico" style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', padding: 0 }}>
                  {order.icon_file
                    ? <img src={getMediaUrl(order.icon_file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Radio size={19} />}
                </span>
                <div className="grow">
                  <div className="flex-row gap-8 wrap" style={{ marginBottom: 4 }}>
                    <strong style={{ fontSize: 15, fontWeight: 800 }}>{order.app_name}</strong>
                    <StatusPill status={order.status} />
                    {order.live_link_enabled ? <span className="chip chip-ok"><ShieldCheck size={11} />Live link</span> : null}
                  </div>
                  <div className="row-sub truncate">
                    #{order.id} · {order.design_name || 'Template'} · {fmtDate(order.created_at)}
                  </div>
                  <div className="row-sub truncate mono" style={{ marginTop: 3, fontSize: 11 }}>
                    {order.package_name}
                  </div>
                </div>
                <span className="chip chip-gold">{order.coins_spent} coins</span>
              </div>

              <div className="btn-group">
                {order.apk_file && (
                  <a className="btn btn-primary btn-sm" href={`/api/orders/${order.id}/download`} download>
                    <Download size={14} /> Download APK
                  </a>
                )}
                {order.fake_apk_file && (
                  <a className="btn btn-soft btn-sm" href={`/api/orders/${order.id}/download-fake`} download>
                    <Globe size={14} /> Fake APK
                  </a>
                )}
                <button className="btn btn-soft btn-sm" onClick={() => onOpenLogs(order.id)}>
                  <Terminal size={14} /> Logs
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => onOpenLiveLinks(order)}>
                  <Radio size={14} /> Dynamic links
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => (onOpenDemoUsers || onOpenLiveLinks)?.(order)}
                  title="App me test/login karne ke liye demo account add karein"
                >
                  <Users size={14} /> Add demo account
                </button>
              </div>

              {(order.status === 'pending' || order.status === 'building') && (
                <div className="trust-strip" style={{ background: 'var(--warn-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,191,36,.22)' }}>
                  <RefreshCw size={14} className="animate-spin" color="var(--warn)" />
                  <span>Build queue me hai — ready hone par yahin download button aa jaayega.</span>
                </div>
              )}
              {order.status === 'failed' && (
                <div className="trust-strip" style={{ background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' }}>
                  <Terminal size={14} color="var(--danger)" />
                  <span>Build fail hua — logs check karein ya support se contact karein.</span>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
