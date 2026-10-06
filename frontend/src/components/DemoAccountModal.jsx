import React, { useEffect, useState } from 'react';
import { Smartphone, Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import { useToast } from './Toast';
import { Sheet, Notice, Spinner } from './ui';
import { orders as ordersApi } from '../lib/api';

/**
 * Add Demo Account — bilkul FREE (koi coins nahi kat-te).
 *
 * Ye "Dynamic live links" se alag feature hai: yahan app me login/registration
 * bypass karne ke liye numbers add hote hain. Live links me app ka register
 * domain/URL badalta hai.
 */
export default function DemoAccountModal({ order, isOpen, onClose }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState('');

  const load = async () => {
    if (!order?.id) return;
    setLoading(true);
    try {
      const data = await ordersApi.demoUsers(order.id);
      setRows(Array.isArray(data) ? data : (data?.users || []));
    } catch (err) {
      addToast(err.message || 'Demo accounts load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setValue('');
    if (isOpen && order?.id) load();
    /* eslint-disable-next-line */
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const add = async (e) => {
    e.preventDefault();
    const key = value.trim();
    if (!key) { addToast('Phone number ya demo user key daalein', 'error'); return; }
    setBusy(true);
    try {
      await ordersApi.addDemoUser(order.id, key);
      addToast('Demo account add ho gaya ✓');
      setValue('');
      await load();
    } catch (err) {
      addToast(err.message || 'Demo account add nahi hua', 'error');
    } finally { setBusy(false); }
  };

  const remove = async (key) => {
    setRemoving(key);
    try {
      await ordersApi.removeDemoUser(order.id, key);
      addToast(`"${key}" hata diya ✓`);
      await load();
    } catch (err) {
      addToast(err.message || 'Remove nahi hua', 'error');
    } finally { setRemoving(''); }
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={Smartphone}
      title="Add Demo Account"
      subtitle={`App: ${order.app_name} · Order #${order.id}`}
    >
      <span className="chip chip-ok" style={{ alignSelf: 'flex-start' }}>
        <Check size={11} /> Free — koi coins nahi kat-te
      </span>

      <Notice tone="info">
        Added numbers app me <b>login / prediction registration bypass</b> kar sakte hain.
        Ye feature aapke live-link change se alag hai (usme domain badalta hai).
      </Notice>

      <form className="stack gap-10" onSubmit={add}>
        <div className="field">
          <span className="label">Demo user number / key</span>
          <div className="flex-row gap-8">
            <input
              className="input grow"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="tel"
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !value.trim()}>
              {busy ? <Spinner /> : <Plus size={15} />} Add Demo
            </button>
          </div>
          <span className="hint">Jis phone number ko demo access dena hai wo number yahan enter karein.</span>
        </div>
      </form>

      <div className="divider" />

      <div className="flex-row between" style={{ alignItems: 'center' }}>
        <span className="row-title">Your Added Demo Accounts ({rows.length})</span>
        <button className="btn btn-ghost btn-xs" onClick={load} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-row gap-8" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          <RefreshCw size={13} className="animate-spin" /> Loading demo accounts…
        </div>
      ) : rows.length === 0 ? (
        <div className="demo-empty">
          Aapne is app ke liye koi demo account add nahi kiya hai. Upar number daal kar <b>Add Demo</b> karein.
        </div>
      ) : (
        <div className="stack gap-6">
          {rows.map((r) => (
            <div key={r.key} className="row-item" style={{ padding: '9px 11px' }}>
              <span className="row-ico" style={{ width: 30, height: 30 }}><Smartphone size={14} /></span>
              <span className="row-main">
                <span className="row-title">{r.key}</span>
                <span className="row-sub">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Demo Account'}
                </span>
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

      <div className="sheet-foot" style={{ padding: 0 }}>
        <button className="btn btn-soft btn-block" onClick={onClose}>Close</button>
      </div>
    </Sheet>
  );
}
