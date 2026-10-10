import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Download, Radio, Terminal, Users } from 'lucide-react';
import { Bot, Globe, Package, Layers, RefreshCw } from '../components/AnimatedIcon';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader, Notice, SectionHead, StatusPill } from '../components/ui';
import { api, fmtDate, openTelegramLink } from '../lib/api';
import { getMediaUrl } from '../utils/media';
import TelegramGate from '../components/TelegramGate';

const FILTERS = [
  ['all', 'All orders'],
  ['apk', 'APKs'],
  ['bot', 'Bots'],
  ['fake', 'Fake sites']
];

function isWebsiteOrder(order) {
  return order.source_kind === 'account' || String(order.key || '').startsWith('website-');
}

function isBotOrder(order) {
  return order.kind === 'bot' || String(order.key || '').startsWith('bot-');
}

function getOrderCategory(order) {
  if (isWebsiteOrder(order)) return 'fake'; // Only purchased fake websites from store
  if (isBotOrder(order)) return 'bot';
  return 'apk'; // APKs, fake APKs, extra variant APKs stay in APKs
}

export default function OrdersView({ onOpenLogs, onOpenLiveLinks, onOpenDemoAccounts, setTab }) {
  const { config } = useStore();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async (signal) => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get('/api/me/purchases', { signal });
      if (!Array.isArray(data)) throw Error('Orders load nahi hue.');
      setRows(data);
      setError('');
    } catch (e) {
      if (!signal?.aborted) setError(e.message || 'Orders load nahi hue. Dobara try karein.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(controller.signal);
    }, 12000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  // Primary fake is already represented inside the parent APK order (with both real & fake APK download buttons),
  // so we filter out duplicate primary fake rows so they don't appear twice or pollute fake sites.
  const cleanRows = useMemo(() => rows.filter((r) => r.source_kind !== 'primary'), [rows]);

  const visible = useMemo(() => {
    return cleanRows.filter((r) => {
      const cat = getOrderCategory(r);
      const matchesFilter = filter === 'all' || cat === filter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'ready' && ['done', 'active'].includes(r.status)) ||
        (statusFilter === 'pending' && ['pending', 'building', 'provisioning'].includes(r.status)) ||
        (statusFilter === 'failed' && (r.status === 'failed' || r.refunded)) ||
        (statusFilter === 'inactive' && ['stopped', 'expired'].includes(r.status));
      return matchesFilter && matchesStatus;
    });
  }, [cleanRows, filter, statusFilter]);

  if (!user) return <TelegramGate botLink={config?.bot_link} />;

  const reload = async () => {
    setBusy(true);
    try {
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SectionHead
        icon={Package}
        title="My Orders"
        sub="APKs, Welcome Bots aur fake sites — saare orders ek jagah"
        action={
          <button className="btn btn-soft btn-sm" onClick={reload} disabled={busy}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <div className="pill-row">
        {FILTERS.map(([key, label]) => {
          const count = key === 'all'
            ? cleanRows.length
            : cleanRows.filter((r) => getOrderCategory(r) === key).length;
          return (
            <button
              key={key}
              className={`pill ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <span>{count}</span>
            </button>
          );
        })}
      </div>

      <label className="flex-row gap-8" style={{ margin: '12px 0' }}>
        Status{' '}
        <select
          className="input"
          style={{ width: 'auto' }}
          aria-label="Order status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="ready">Ready / active</option>
          <option value="pending">In progress</option>
          <option value="failed">Failed / refunded</option>
          <option value="inactive">Stopped / expired</option>
        </select>
      </label>

      {error && (
        <Notice tone="danger">
          {error} <button className="btn btn-soft btn-xs" onClick={reload}>Retry</button>
        </Notice>
      )}

      {loading ? (
        <Loader label="Orders load ho rahe hain…" />
      ) : !visible.length ? (
        <EmptyState
          icon={Box}
          title={cleanRows.length ? 'Is category mein koi order nahi' : 'Abhi koi order nahi hai'}
          text="APK hacks, Welcome Bot ya Fake Website explore karke shuru karein."
          action={
            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => setTab('templates')}>
                <Layers size={14} /> Hacks
              </button>
              <button className="btn btn-soft" onClick={() => setTab('deploy')}>
                <Bot size={14} /> Welcome Bot
              </button>
              <button className="btn btn-soft" onClick={() => setTab('fakesite')}>
                <Globe size={14} /> Fake Website
              </button>
            </div>
          }
        />
      ) : (
        <div className="stack gap-12">
          {visible.map((order) => {
            const isBot = isBotOrder(order);
            const isWebsite = isWebsiteOrder(order);
            const isExtraApk = order.source_kind === 'extra';
            const pending = ['pending', 'building', 'provisioning'].includes(order.status);
            const Icon = isBot ? Bot : isWebsite ? Globe : Package;

            return (
              <article key={order.key} className="card card-pad stack gap-12">
                <div className="flex-row gap-12" style={{ alignItems: 'flex-start' }}>
                  <span className="row-ico" style={{ width: 44, height: 44, overflow: 'hidden', flexShrink: 0 }}>
                    {order.icon_file ? (
                      <img src={getMediaUrl(order.icon_file)} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <Icon size={20} />
                    )}
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="flex-row wrap gap-8">
                      <strong>{isBot ? `@${order.bot_username}` : order.app_name}</strong>
                      {isBot ? (
                        <span className={`status ${order.status === 'active' ? 'ok' : order.refunded ? 'danger' : 'warn'}`}>
                          {order.refunded ? 'Refunded' : order.status}
                        </span>
                      ) : (
                        <StatusPill status={order.status} />
                      )}
                    </div>
                    <div className="row-sub">
                      {isBot
                        ? (order.purchase_type === 'renew' ? 'Bot renewal' : 'Welcome Bot')
                        : isWebsite
                          ? 'Fake site'
                          : (isExtraApk ? 'Additional APK' : 'APK')} · #{order.id} · {fmtDate(order.created_at)}
                    </div>
                    {isBot && (
                      <div className="row-sub">
                        {order.plan_name}{order.expires_at && ` · Expires ${fmtDate(order.expires_at)}`}
                      </div>
                    )}
                    {isExtraApk && (
                      <div className="row-sub">
                        Additional variant · APK order #{order.order_id}
                      </div>
                    )}
                  </div>
                  {(!isExtraApk || isWebsite) && (
                    <span className="chip chip-gold">
                      ₹{Number(isBot ? order.coins : order.coins_spent || 0).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <div className="btn-group">
                  {isBot ? (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openTelegramLink(`https://t.me/${order.bot_username}?start=manage`)}
                      >
                        Manage in Telegram
                      </button>
                      <button className="btn btn-soft btn-sm" onClick={() => setTab('deploy')}>
                        Bot details / renew
                      </button>
                    </>
                  ) : isWebsite ? (
                    <>
                      <span className="hint">
                        {order.purchase_type === 'renew' ? 'Website renewal' : 'Website purchase'}
                        {Array.isArray(order.lease_ids) && order.lease_ids.length > 0 && ` · Accounts ${order.lease_ids.join(', ')}`}
                      </span>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          sessionStorage.setItem('site-store-tab', 'accounts');
                          setTab('fakesite');
                        }}
                      >
                        Login details / renew
                      </button>
                    </>
                  ) : isExtraApk ? (
                    <>
                      {order.apk_file && (
                        <a
                          className="btn btn-primary btn-sm"
                          download
                          href={`/api/orders/${order.order_id}/fake-sites/${order.id}/download`}
                        >
                          <Download size={14} /> Download fake APK
                        </a>
                      )}
                    </>
                  ) : (
                    <>
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
                      {pending && (
                        <button className="btn btn-soft btn-sm" onClick={() => onOpenLogs(order.id)}>
                          <Terminal size={14} /> Build progress
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" onClick={() => onOpenLiveLinks(order)}>
                        <Radio size={14} /> Update link
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpenDemoAccounts?.(order)}>
                        <Users size={14} /> Demo accounts
                      </button>
                    </>
                  )}
                </div>

                {pending && <p className="hint">{isBot ? 'Bot setup' : 'App build'} chal raha hai. Status yahin update hoga.</p>}
                {order.refunded && <p className="hint">₹{order.coins} wallet mein refund ho chuke hain.</p>}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
