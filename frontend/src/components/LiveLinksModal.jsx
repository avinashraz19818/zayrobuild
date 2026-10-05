import React, { useState } from 'react';
import { Radio, Globe, Link2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Sheet, Notice } from './ui';
import { orders as ordersApi } from '../lib/api';

const TYPES = [
  { key: 'domain', label: 'Main domain', hint: 'Sirf domain badalna hai, register URL ka baaki part same rahega' },
  { key: 'invite', label: 'Full invite code', hint: 'Poora register URL / invite code replace hoga' }
];

export default function LiveLinksModal({ order, isOpen, onClose, onUpdated }) {
  const { refreshUser } = useAuth();
  const { addToast } = useToast();
  const [type, setType] = useState('domain');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen || !order) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) { addToast('Naya domain ya URL daalein', 'error'); return; }
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

      <div className="field">
        <span className="label">Change type</span>
        <div className="stack gap-8">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="row-item"
              style={type === t.key ? { boxShadow: 'inset 0 0 0 1px var(--line-2)', background: 'var(--brand-soft)' } : undefined}
              onClick={() => setType(t.key)}
            >
              <span className="row-ico">{t.key === 'domain' ? <Globe size={16} /> : <Link2 size={16} />}</span>
              <span className="row-main">
                <span className="row-title">{t.label}</span>
                <span className="row-sub">{t.hint}</span>
              </span>
            </button>
          ))}
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
          <span className="hint">Change karne par admin setting ke hisaab se coins kat-te hain.</span>
        </div>

        <Notice tone="info">
          Current register link: <span className="mono">{order.register_url || '—'}</span>
        </Notice>

        <div className="sheet-foot" style={{ padding: 0 }}>
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary grow" disabled={busy}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <Radio size={15} />}
            {busy ? 'Updating…' : 'Update live link'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
