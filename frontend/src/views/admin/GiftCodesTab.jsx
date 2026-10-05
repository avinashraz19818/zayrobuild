import React, { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, RefreshCw, Check, X, Copy, Sparkles, Ticket } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, EmptyState, Notice } from '../../components/ui';
import { admin, fmtDate, copyText } from '../../lib/api';

const BLANK = { code: '', coins: '', max_claims: '1', note: '', expires_at: '' };

const QUICK = [50, 100, 250, 500, 1000];

/** Gift codes — admin banata hai, user profile me claim karta hai. */
export default function GiftCodesTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.giftCodes();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message || 'Gift codes load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.coins) { addToast('Coins value daalein', 'error'); return; }
    setBusy(true);
    try {
      const res = await admin.createGiftCode({
        code: draft.code.trim().toUpperCase(),
        coins: parseInt(draft.coins, 10) || 0,
        max_claims: parseInt(draft.max_claims, 10) || 1,
        note: draft.note.trim(),
        expires_at: draft.expires_at.trim()
      });
      setLastCode(res?.code || '');
      addToast(`Gift code ban gaya: ${res?.code}`, 'success');
      setDraft(BLANK);
      await load();
    } catch (err) {
      addToast(err.message || 'Gift code create nahi hua', 'error');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title">
          <Gift size={15} style={{ verticalAlign: -2 }} /> Gift codes ({rows.length})
        </div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* Naya code */}
      <form className="card card-pad stack gap-12" onSubmit={submit}>
        <div className="flex-row gap-8">
          <Plus size={14} color="var(--brand-2)" />
          <span className="row-title">Naya gift code</span>
        </div>

        <div className="flex-row gap-8 wrap">
          <div className="field grow" style={{ minWidth: 150 }}>
            <span className="label">Coins amount *</span>
            <input
              className="input" inputMode="numeric" value={draft.coins}
              onChange={(e) => setDraft((d) => ({ ...d, coins: e.target.value }))}
              placeholder="100"
            />
            <div className="flex-row gap-6" style={{ flexWrap: 'wrap', marginTop: 6 }}>
              {QUICK.map((q) => (
                <button key={q} type="button" className={`pill ${String(q) === draft.coins ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => setDraft((d) => ({ ...d, coins: String(q) }))}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ minWidth: 110 }}>
            <span className="label">Max claims (0 = ∞)</span>
            <input
              className="input" inputMode="numeric" value={draft.max_claims}
              onChange={(e) => setDraft((d) => ({ ...d, max_claims: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex-row gap-8 wrap">
          <div className="field grow" style={{ minWidth: 150 }}>
            <span className="label">Custom code (optional)</span>
            <input
              className="input mono" value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              placeholder="khaali chhodo to auto ban jaayega"
            />
          </div>
          <div className="field grow" style={{ minWidth: 140 }}>
            <span className="label">Expiry (optional)</span>
            <input
              className="input" type="date" value={draft.expires_at}
              onChange={(e) => setDraft((d) => ({ ...d, expires_at: e.target.value }))}
            />
          </div>
        </div>

        <div className="field">
          <span className="label">Note (sirf admin ke liye)</span>
          <input
            className="input" value={draft.note} maxLength={120}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            placeholder="e.g. Diwali promo batch"
          />
        </div>

        <button className="btn btn-gold btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating…' : <><Sparkles size={15} /> Create gift code</>}
        </button>

        {lastCode && (
          <div className="gift-created">
            <span className="row-ico gold" style={{ width: 38, height: 38, borderRadius: 12 }}><Ticket size={16} /></span>
            <span className="grow">
              <span className="row-title mono" style={{ fontSize: 14 }}>{lastCode}</span>
              <span className="row-sub">Users ko ye code bhejein — profile → Gift Code me claim karenge</span>
            </span>
            <button
              type="button" className="btn btn-soft btn-xs"
              onClick={async () => { await copyText(lastCode); addToast('Code copy ho gaya', 'success'); }}
            >
              <Copy size={12} /> Copy
            </button>
          </div>
        )}
      </form>

      {/* List */}
      {loading ? (
        <Loader label="Gift codes load ho rahe hain…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Gift} title="Koi gift code nahi" text="Upar se pehla code banayein — user profile me claim kar sakta hai." />
      ) : (
        <div className="admin-table">
          {rows.map((g) => {
            const exhausted = g.max_claims > 0 && g.claims >= g.max_claims;
            const expired = g.expires_at && new Date(g.expires_at).getTime() < Date.now();
            const state = !g.active ? 'Off' : exhausted ? 'Used up' : expired ? 'Expired' : 'Active';
            const cls = !g.active || exhausted || expired ? 'warn' : 'ok';
            return (
              <div className="card card-pad flex-row between gap-10 wrap" key={g.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="flex-row gap-8 wrap">
                    <strong className="mono" style={{ fontSize: 14, fontWeight: 800 }}>{g.code}</strong>
                    <span className={`status ${cls}`}>{state}</span>
                    <span className="chip chip-gold">+{g.coins} coins</span>
                  </div>
                  <div className="admin-row-meta" style={{ marginTop: 3 }}>
                    <span>claimed {g.claims}{g.max_claims ? `/${g.max_claims}` : ' (unlimited)'}</span>
                    {g.expires_at && <><span>·</span><span>expires {g.expires_at}</span></>}
                    <span>·</span>
                    <span>{fmtDate(g.created_at)}</span>
                    {g.note && <><span>·</span><span>{g.note}</span></>}
                  </div>
                </div>
                <div className="admin-actions">
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={async () => { await copyText(g.code); addToast('Code copy ho gaya', 'success'); }}
                  >
                    <Copy size={13} /> Copy
                  </button>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => act(async () => {
                      await admin.setGiftCode(g.id, g.active ? 0 : 1);
                      await load();
                    }, g.active ? 'Code band kar diya' : 'Code on kar diya')}
                  >
                    {g.active ? <><X size={13} /> Disable</> : <><Check size={13} /> Enable</>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => act(async () => {
                      await admin.deleteGiftCode(g.id);
                      await load();
                    }, 'Gift code delete ho gaya')}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Notice tone="info">
        User profile me <b>Gift Code</b> par click karke code claim karta hai — coins usi account me turant add hote hain
        aur claim history user ko dikhti hai. Ek code ek account me sirf ek baar chalta hai.
      </Notice>
    </>
  );
}
