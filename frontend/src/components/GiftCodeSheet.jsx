import React, { useEffect, useRef, useState } from 'react';
import { Gift, Sparkles, CheckCircle2, AlertCircle, PartyPopper, History } from 'lucide-react';
import { Sheet, Notice, Spinner } from './ui';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { wallet as walletApi, fmtDate } from '../lib/api';

/**
 * Gift Code — profile se khulta hai.
 * User code paste karke claim karta hai; coins usi account me turant add hote hain
 * aur ek premium "claimed" popup (coins + new balance) dikhta hai.
 */
export default function GiftCodeSheet({ open, onClose }) {
  const { refreshUser } = useAuth();
  const { refreshOrders } = useStore();
  const { addToast } = useToast();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(null);      // { code, coins, balance }
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const inputRef = useRef(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const rows = await walletApi.giftClaims();
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (_) { /* silent */ } finally { setLoadingHistory(false); }
  };

  useEffect(() => {
    if (!open) return;
    setCode('');
    setClaimed(null);
    loadHistory();
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [open]);

  const claim = async (e) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (value.length < 4) { addToast('Gift code daalein', 'error'); return; }
    setBusy(true);
    try {
      const res = await walletApi.claimGift(value);
      setClaimed({ code: res.code || value, coins: res.coins || 0, balance: res.balance || 0 });
      setCode('');
      await Promise.all([refreshUser(), refreshOrders?.()].filter(Boolean));
      await loadHistory();
    } catch (err) {
      addToast(err.message || 'Gift code claim nahi hua', 'error');
    } finally { setBusy(false); }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      icon={Gift}
      title="Gift Code"
      subtitle="Code paste karein — coins turant aapke account me add ho jaayenge"
    >
      {/* ── Celebrate (claim hone ke baad) ── */}
      {claimed ? (
        <div className="gift-win">
          <span className="gift-burst" aria-hidden="true" />
          <span className="gift-win-ico"><PartyPopper size={30} /></span>
          <h3 className="gift-win-title">Gift Code Claimed!</h3>
          <p className="gift-win-code">#{claimed.code}</p>
          <div className="gift-win-coins">
            <span className="coin-dot" style={{ width: 26, height: 26 }}>
              <span style={{ fontSize: 15, fontWeight: 900 }}>₹</span>
            </span>
            <b>+{claimed.coins}</b>
            <span className="gift-win-unit">coins</span>
          </div>
          <div className="gift-win-note">
            Naya balance: <b>{claimed.balance} coins</b>
          </div>
          <div className="flex-row gap-8" style={{ justifyContent: 'center', marginTop: 14 }}>
            <button className="btn btn-soft btn-sm" onClick={() => setClaimed(null)}>
              <Gift size={14} /> Ek aur claim
            </button>
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              <CheckCircle2 size={14} /> Done
            </button>
          </div>
        </div>
      ) : (
        <form className="stack gap-12" onSubmit={claim}>
          <div className="gift-hero">
            <span className="gift-hero-ico"><Gift size={22} /></span>
            <div>
              <div className="gift-hero-title">Redeem your gift code</div>
              <div className="gift-hero-sub">Admin ke diye code ka poora amount aapke wallet me aa jaata hai</div>
            </div>
          </div>

          <div className="field">
            <span className="label">Gift code</span>
            <input
              ref={inputRef}
              className="input gift-input mono"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ZR-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
            />
            <span className="hint"><Sparkles size={11} style={{ verticalAlign: -1 }} /> Code mein spaces ya dash farak nahi padta.</span>
          </div>

          <button className="btn btn-gold btn-block btn-lg" type="submit" disabled={busy || code.trim().length < 4}>
            {busy ? <Spinner /> : <Gift size={16} />}
            {busy ? 'Claiming…' : 'Claim gift code'}
          </button>

          <Notice tone="info">
            Ek code ek account me sirf ek baar chalta hai. Code ka amount admin set karta hai.
          </Notice>
        </form>
      )}

      {/* ── History ── */}
      <div className="gift-history">
        <div className="gift-history-head">
          <History size={13} />
          <span>Aapke claim kiye codes {history.length > 0 ? `(${history.length})` : ''}</span>
        </div>
        {loadingHistory ? (
          <div className="center-pad" style={{ padding: '10px 0' }}><Spinner size={14} /><span>Loading…</span></div>
        ) : history.length === 0 ? (
          <div className="gift-empty"><AlertCircle size={13} /> Abhi tak koi gift code claim nahi kiya.</div>
        ) : (
          <div className="stack gap-6">
            {history.map((h) => (
              <div className="gift-row" key={h.id}>
                <span className="gift-row-code mono">{h.code}</span>
                <span className="gift-row-meta">{fmtDate(h.created_at)}</span>
                <span className="gift-row-coins">+{h.coins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
