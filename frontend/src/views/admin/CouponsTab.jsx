import React, { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, EmptyState, Notice } from '../../components/ui';
import { admin, fmtDate } from '../../lib/api';

const BLANK = { code: '', type: 'fixed', value: '', max_uses: '0', expires_at: '' };

/** Coupons — build wizard ka "Coupon code" field inhi se chalta hai. */
export default function CouponsTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.coupons();
      setRows(Array.isArray(data) ? data : (data?.coupons || []));
    } catch (err) {
      addToast(err.message || 'Coupons load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.code.trim() || !draft.value) { addToast('Code aur value chahiye', 'error'); return; }
    setBusy(true);
    try {
      await admin.createCoupon({
        code: draft.code.trim().toUpperCase(),
        type: draft.type,
        value: parseInt(draft.value, 10) || 0,
        max_uses: parseInt(draft.max_uses, 10) || 0,
        expires_at: draft.expires_at.trim()
      });
      addToast('Coupon ban gaya', 'success');
      setDraft(BLANK);
      await load();
    } catch (err) {
      addToast(err.message || 'Coupon create nahi hua', 'error');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><Ticket size={15} style={{ verticalAlign: -2 }} /> Coupons ({rows.length})</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      <form className="card card-pad stack gap-12" onSubmit={submit}>
        <div className="flex-row gap-8"><Plus size={14} color="var(--brand-2)" /><span className="row-title">Naya coupon</span></div>
        <div className="flex-row gap-8 wrap">
          <div className="field grow" style={{ minWidth: 120 }}>
            <span className="label">Code</span>
            <input className="input mono" value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="SAVE10" />
          </div>
          <div className="field grow" style={{ minWidth: 110 }}>
            <span className="label">Type</span>
            <select className="input" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
              <option value="fixed">Fixed coins off</option>
              <option value="percent">Percent off</option>
            </select>
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Value</span>
            <input className="input" inputMode="numeric" value={draft.value}
              onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} placeholder="10" />
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Max uses (0 = ∞)</span>
            <input className="input" inputMode="numeric" value={draft.max_uses}
              onChange={(e) => setDraft((d) => ({ ...d, max_uses: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <span className="label">Expiry (optional)</span>
          <input className="input" type="date" value={draft.expires_at}
            onChange={(e) => setDraft((d) => ({ ...d, expires_at: e.target.value }))} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create coupon'}</button>
      </form>

      {loading ? (
        <Loader label="Coupons load ho rahe hain…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Ticket} title="Koi coupon nahi" text="Pehla coupon banayein — build wizard me apply ho jaayega." />
      ) : (
        <div className="admin-table">
          {rows.map((c) => (
            <div className="card card-pad flex-row between gap-10 wrap" key={c.id}>
              <div style={{ minWidth: 0 }}>
                <div className="flex-row gap-8 wrap">
                  <strong className="admin-mini" style={{ fontSize: 14, fontWeight: 800 }}>{c.code}</strong>
                  <span className={`status ${c.active ? 'ok' : 'warn'}`}>{c.active ? 'Active' : 'Off'}</span>
                </div>
                <div className="admin-row-meta" style={{ marginTop: 3 }}>
                  <span>{c.type === 'percent' ? `${c.value}% off` : `${c.value} coins off`}</span>
                  <span>·</span>
                  <span>used {c.used_count || 0}{c.max_uses ? `/${c.max_uses}` : ''}</span>
                  {c.expires_at && <><span>·</span><span>expires {c.expires_at}</span></>}
                  <span>·</span>
                  <span>{fmtDate(c.created_at)}</span>
                </div>
              </div>
              <div className="admin-actions">
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => act(async () => {
                    await admin.setCoupon(c.id, c.active ? 0 : 1);
                    await load();
                  }, c.active ? 'Coupon band kar diya' : 'Coupon on kar diya')}
                >
                  {c.active ? <><X size={13} /> Disable</> : <><Check size={13} /> Enable</>}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => act(async () => {
                    await admin.deleteCoupon(c.id);
                    await load();
                  }, 'Coupon delete ho gaya')}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Notice tone="info">Coupon build wizard ke step 3 par apply hota hai — discount coins me kaata jaata hai.</Notice>
    </>
  );
}
