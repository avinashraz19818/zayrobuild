import React, { useEffect, useState } from 'react';
import {Radio, Link2, IndianRupee as Coins, AlertTriangle} from 'lucide-react';
import {Globe, ShieldCheck, RefreshCw} from './AnimatedIcon';
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

/* ─────────────────────────  Main sheet  ───────────────────────── */

export default function LiveLinksModal({ order, isOpen, onClose, onUpdated }) {
  const { refreshUser, user } = useAuth();
  const { config } = useStore();
  const { addToast } = useToast();
  const [type, setType] = useState('domain');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen || !order) return null;

  const priceOf = (t) => Number(config?.[t.priceKey] ?? 10);
  const active = TYPES.find((t) => t.key === type) || TYPES[0];
  const cost = priceOf(active);
  const costLabel = cost > 0 ? `₹${cost}` : 'Free';
  const balance = Number(user?.coins || 0);
  const short = balance < cost;

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) { addToast('Naya domain ya URL daalein', 'error'); return; }
    if (short) { addToast(`balance kam hain — ₹${cost} chahiye, aapke paas ${balance} hain.`, 'error'); return; }
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
      title="Update link"
      subtitle={`Order #${order.id} · ${order.app_name}`}
    >
      <div className="trust-strip">
        <ShieldCheck size={14} color="var(--ok)" />
        <span>Link badalne ke baad <b>purane installed APKs bhi naya link use karte hain</b> — dobara build ki zaroorat nahi.</span>
      </div>

      {/* Balance — pata rahe kitne coins hain */}
      <div className="flex-row between" style={{ alignItems: 'center' }}>
        <span className="hint" style={{ margin: 0 }}>Aapka balance</span>
        <span className="chip chip-gold"><Coins size={11} /> ₹{balance}</span>
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
                  <Coins size={11} /> {tCost > 0 ? `₹${tCost}` : 'Free'}
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
            <span>balance kam hain — <b>{costLabel}</b> chahiye, aapke paas <b>{balance}</b> hain. Wallet me top-up karein.</span>
          </div>
        )}

        <Notice tone="info">
          Current register link: <span className="mono">{order.register_url || '—'}</span>
        </Notice>

        <div className="sheet-foot" style={{ padding: 0 }}>
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary grow" disabled={busy || short}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Radio size={15} />}
            {busy ? 'Updating…' : short ? `balance kam hain (${cost} chahiye)` : `Update live link · ${costLabel}`}
          </button>
        </div>
      </form>


    </Sheet>
  );
}
