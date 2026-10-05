import React, { useEffect, useState } from 'react';
import {
  Radio, Globe, Link2, ShieldCheck, RefreshCw, Coins, Users, Plus, Trash2, Smartphone, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from './Toast';
import { Sheet, Notice, Spinner } from './ui';
import { orders as ordersApi } from '../lib/api';

const TYPES = [
  {
    key: 'domain',
    label: 'Main domain',
    hint: 'Sirf domain badalna hai, register URL ka baaki part same rahega',
    priceKey: 'domain_change_price'
  },
  {
    key: 'invite',
    label: 'Full invite code',
    hint: 'Poora register URL / invite code replace hoga',
    priceKey: 'invite_code_change_price'
  }
];

/* ─────────────────────────  Demo accounts  ───────────────────────── */

function DemoAccountsSection({ order, price = 0, balance = 0, onChanged }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.demoUsers(order.id);
      setRows(Array.isArray(data) ? data : (data?.users || []));
    } catch (err) {
      addToast(err.message || 'Demo accounts load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [order.id]);

  const add = async (e) => {
    e.preventDefault();
    if (!value.trim()) { addToast('Phone number ya user key daalein', 'error'); return; }
    if (price > 0 && balance < price) {
      addToast(`Coins kam hain — demo account ke ${price} coins chahiye, aapke paas ${balance} hain.`, 'error');
      return;
    }
    setBusy(true);
    try {
      await ordersApi.addDemoUser(order.id, value.trim());
      addToast(price > 0 ? `Demo account add ho gaya (${price} coins kate)` : 'Demo account add ho gaya (free)', 'success');
      setValue('');
      await load();
      await onChanged?.();
    } catch (err) {
      addToast(err.message || 'Demo account add nahi hua', 'error');
    } finally { setBusy(false); }
  };

  const remove = async (key) => {
    setRemoving(key);
    try {
      await ordersApi.removeDemoUser(order.id, key);
      addToast(`${key} hata diya`, 'success');
      await load();
    } catch (err) {
      addToast(err.message || 'Remove nahi hua', 'error');
    } finally { setRemoving(''); }
  };

  return (
    <div className="stack gap-10">
      <div className="flex-row gap-8" style={{ alignItems: 'center' }}>
        <Users size={15} color="var(--brand-2)" />
        <span className="row-title">Demo accounts</span>
        <span className="chip chip-brand">{rows.length}</span>
        <span className={`chip ${price > 0 ? 'chip-gold' : 'chip-ok'}`} style={{ marginLeft: 'auto' }}>
          <Coins size={11} /> {price > 0 ? `${price} coins / account` : 'Free'}
        </span>
      </div>
      <span className="hint">
        Demo account se aap apni app me test/login kar sakte hain — user ko app me dikhta nahi.
        {price > 0 ? ` Har naye account par ${price} coins kat-te hain.` : ' Ye feature abhi free hai.'}
      </span>

      <form className="flex-row gap-8" onSubmit={add}>
        <input
          className="input grow"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Phone number ya user key (e.g. 9876543210)"
          inputMode="tel"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || (price > 0 && balance < price)}>
          {busy ? <Spinner /> : <Plus size={15} />} {price > 0 ? `Add · ${price} coins` : 'Add · Free'}
        </button>
      </form>

      {loading ? (
        <div className="flex-row gap-8" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          <RefreshCw size={13} className="animate-spin" /> Demo accounts load ho rahe hain…
        </div>
      ) : rows.length === 0 ? (
        <Notice tone="info">Abhi koi demo account add nahi hua.</Notice>
      ) : (
        <div className="stack gap-6">
          {rows.map((r) => (
            <div key={r.key} className="row-item" style={{ padding: '9px 11px' }}>
              <span className="row-ico" style={{ width: 30, height: 30 }}><Smartphone size={14} /></span>
              <span className="row-main">
                <span className="row-title">{r.key}</span>
                <span className="row-sub">{r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''}</span>
              </span>
              <button
                className="btn btn-ghost btn-xs danger"
                onClick={() => remove(r.key)}
                disabled={removing === r.key}
              >
                {removing === r.key ? <Spinner /> : <Trash2 size={12} />} Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Main sheet  ───────────────────────── */

export default function LiveLinksModal({ order, isOpen, onClose, onUpdated, section = 'links' }) {
  const { refreshUser, user } = useAuth();
  const { config } = useStore();
  const { addToast } = useToast();
  const [type, setType] = useState('domain');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const demoRef = React.useRef(null);

  // "Demo accounts" button se khulne par seedha demo section par le jaao
  useEffect(() => {
    if (!isOpen || section !== 'demo') return;
    const t = setTimeout(() => {
      const el = demoRef.current;
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
    return () => clearTimeout(t);
  }, [isOpen, section, order?.id]);

  if (!isOpen || !order) return null;

  const priceOf = (t) => Number(config?.[t.priceKey] ?? 10);
  const active = TYPES.find((t) => t.key === type) || TYPES[0];
  const cost = priceOf(active);
  const costLabel = cost > 0 ? `${cost} coins` : 'Free';
  const balance = Number(user?.coins || 0);
  const short = balance < cost;
  const demoPrice = Number(config?.demo_user_price ?? 0);
  const onDemoChanged = async () => { await refreshUser(); };

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) { addToast('Naya domain ya URL daalein', 'error'); return; }
    if (short) { addToast(`Coins kam hain — ${cost} coins chahiye, aapke paas ${balance} hain.`, 'error'); return; }
    setBusy(true);
    try {
      const res = await ordersApi.changeDomain(order.id, { new_register_url: value.trim(), change_type: type });
      addToast(res?.message || 'Live links update ho gaye — installed APKs turant switch ho jaayenge.', 'success');
      await refreshUser();
      onUpdated?.(res);
      setValue('');
      onClose?.();
    } catch (err) {
      addToast(err.message || 'Link update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={Radio}
      title="Dynamic live links"
      subtitle={`Order #${order.id} · ${order.app_name}`}
    >
      <div className="trust-strip">
        <ShieldCheck size={14} color="var(--ok)" />
        <span>Link badalne ke baad <b>purane installed APKs bhi naya link use karte hain</b> — dobara build ki zaroorat nahi.</span>
      </div>

      {/* Balance — pata rahe kitne coins hain */}
      <div className="flex-row between" style={{ alignItems: 'center' }}>
        <span className="hint" style={{ margin: 0 }}>Aapka balance</span>
        <span className="chip chip-gold"><Coins size={11} /> {balance} coins</span>
      </div>

      <div className="field">
        <span className="label">Change type</span>
        <div className="stack gap-8">
          {TYPES.map((t) => {
            const tCost = priceOf(t);
            const selected = type === t.key;
            return (
              <button
                key={t.key}
                type="button"
                className="row-item"
                style={selected ? { boxShadow: 'inset 0 0 0 1px var(--line-2)', background: 'var(--brand-soft)' } : undefined}
                onClick={() => setType(t.key)}
              >
                <span className="row-ico">{t.key === 'domain' ? <Globe size={16} /> : <Link2 size={16} />}</span>
                <span className="row-main">
                  <span className="row-title">{t.label}</span>
                  <span className="row-sub">{t.hint}</span>
                </span>
                <span className={`chip ${selected ? 'chip-gold' : 'chip-brand'}`} style={{ flexShrink: 0 }}>
                  <Coins size={11} /> {tCost > 0 ? `${tCost} coins` : 'Free'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form className="stack gap-12" onSubmit={submit}>
        <div className="field">
          <span className="label">{type === 'domain' ? 'Naya domain' : 'Naya register URL'}</span>
          <input
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === 'domain' ? 'newdomain.com' : 'https://site.com/register?ref=abc'}
            inputMode="url"
          />
        </div>

        <div className="flex-row between" style={{ alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,.035)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          <span className="flex-row gap-6" style={{ fontSize: 12.5, color: 'var(--dim)' }}>
            <Coins size={13} color="var(--gold)" />
            {active.label} change karne ka charge
          </span>
          <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{costLabel}</b>
        </div>

        {short && (
          <div className="trust-strip" style={{ background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' }}>
            <AlertTriangle size={14} color="var(--danger)" />
            <span>Coins kam hain — <b>{costLabel}</b> chahiye, aapke paas <b>{balance}</b> hain. Wallet me top-up karein.</span>
          </div>
        )}

        <Notice tone="info">
          Current register link: <span className="mono">{order.register_url || '—'}</span>
        </Notice>

        <div className="sheet-foot" style={{ padding: 0 }}>
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary grow" disabled={busy || short}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Radio size={15} />}
            {busy ? 'Updating…' : short ? `Coins kam hain (${cost} chahiye)` : `Update live link · ${costLabel}`}
          </button>
        </div>
      </form>

      <div className="divider" />

      <div ref={demoRef}>
        <DemoAccountsSection order={order} price={demoPrice} balance={balance} onChanged={onDemoChanged} />
      </div>
    </Sheet>
  );
}
