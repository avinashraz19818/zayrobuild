import React, { useEffect, useState } from 'react';
import {
  Wallet, QrCode, Copy, Check, Upload, Clock, ShieldCheck, BadgeCheck, AlertCircle, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/Toast';
import { EmptyState, Loader, Notice, SectionHead, StatusPill } from '../components/ui';
import { wallet as walletApi, copyText, fmtDate, api } from '../lib/api';
import { getMediaUrl } from '../utils/media';
import TelegramGate from '../components/TelegramGate';

const PACKS = [100, 250, 500, 1000, 2500];

export default function WalletView({ setTab }) {
  const { user, refreshUser, openAuth } = useAuth();
  const { payment, refreshPayment, config } = useStore();
  const { addToast } = useToast();

  const [coins, setCoins] = useState(250);
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copied, setCopied] = useState(false);

  const rate = parseFloat(payment?.coin_rate) || 1;
  const amount = Math.round(coins * rate);

  const loadHistory = async () => {
    if (!user) { setLoadingHistory(false); return; }
    try {
      const data = await api.get('/api/me/coin-requests');
      setHistory(Array.isArray(data) ? data : (data?.requests || []));
    } catch (_) { /* silent */ }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { refreshPayment(); loadHistory(); /* eslint-disable-next-line */ }, [user]);

  if (!user) {
    return <TelegramGate botLink={config?.bot_link} />;
  }

  const copyUpi = async () => {
    const ok = await copyText(payment?.upi_id || '');
    if (ok) { setCopied(true); addToast('UPI ID copied', 'success'); setTimeout(() => setCopied(false), 2000); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!coins || coins < 1) { addToast('Valid coin amount daalein (minimum 1)', 'error'); return; }
    if (!utr.trim() || utr.trim().length < 4) { addToast('Valid UTR / transaction reference daalein', 'error'); return; }
    if (!file) { addToast('Payment screenshot upload karna zaroori hai', 'error'); return; }

    setSubmitting(true);
    try {
      await walletApi.request({ coins, utr: utr.trim(), screenshot: file });
      addToast('Request bhej di gayi — admin verify karke coins add karega.', 'success');
      setUtr(''); setFile(null);
      const input = document.getElementById('pay-shot');
      if (input) input.value = '';
      await Promise.all([refreshUser(), loadHistory()]);
      setTab?.('account');
    } catch (err) {
      addToast(err.message || 'Request failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button className="btn btn-ghost btn-xs" style={{ alignSelf: 'flex-start' }} onClick={() => setTab?.('account')}>
        <ArrowLeft size={13} /> Account
      </button>

      <SectionHead icon={Wallet} title="Add Fund" sub="UPI se payment karein, admin approve karte hi coins add ho jaate hain" />

      <section className="balance-card">
        <div>
          <span className="label">Current balance</span>
          <div className="balance-value">
            ₹{Number(user.coins || 0).toLocaleString('en-IN')}
            <small>≈ ₹{(Number(user.coins || 0) * rate).toLocaleString('en-IN')}</small>
          </div>
          <div className="balance-note">1 coin = ₹{rate}</div>
        </div>
        <span className="chip chip-gold"><BadgeCheck size={12} /> Verified UPI</span>
      </section>

      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span><b>Manual verification</b> · payment proof ke saath 5–30 min me coins credit</span>
      </div>

      <section className="section">
        <SectionHead icon={QrCode} title="Choose amount" />
        <div className="pill-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
          {PACKS.map((p) => (
            <button key={p} className={`pill ${coins === p ? 'active' : ''}`} onClick={() => setCoins(p)}>
              {p} coins · ₹{Math.round(p * rate)}
            </button>
          ))}
        </div>
        <div className="field">
          <span className="label">Custom coins</span>
          <input
            type="number"
            className="input"
            min={1}
            value={coins}
            onChange={(e) => setCoins(parseInt(e.target.value, 10) || 0)}
          />
          <span className="hint">You pay <b style={{ color: 'var(--gold)' }}>₹{amount.toLocaleString('en-IN')}</b> for {coins || 0} coins</span>
        </div>
      </section>

      <section className="section">
        <SectionHead icon={QrCode} title="Scan & pay" sub="Payment ke baad UTR + screenshot neeche submit karein" />
        <div className="card card-pad stack gap-12">
          {payment?.upi_qr_image ? (
            <div className="qr-frame">
              <img src={getMediaUrl(payment.upi_qr_image)} alt="UPI QR" />
            </div>
          ) : (
            <div className="qr-frame" style={{ display: 'grid', placeItems: 'center', width: 210, height: 210 }}>
              <QrCode size={120} color="#111" />
            </div>
          )}

          {payment?.upi_id ? (
            <div className="copy-box">
              <span className="grow truncate">{payment.upi_id}</span>
              <button type="button" className="btn btn-soft btn-xs" onClick={copyUpi}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy UPI'}
              </button>
            </div>
          ) : (
            <Notice tone="warn">Admin ne abhi UPI details set nahi ki hain — support se contact karein.</Notice>
          )}
        </div>
      </section>

      <form className="section" onSubmit={submit}>
        <SectionHead icon={Upload} title="Submit payment proof" sub="Galat UTR se request reject ho jaati hai" />
        <div className="card card-pad stack gap-12">
          <div className="field">
            <span className="label">UTR / transaction reference *</span>
            <input
              className="input"
              placeholder="e.g. 428192837192"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="field">
            <span className="label">Payment screenshot *</span>
            <input
              id="pay-shot"
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <span className="hint">Screenshot mandatory hai — isi se admin payment verify karta hai.</span>
          </div>

          <button type="submit" className="btn btn-gold btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Submitting…' : `Submit ₹${amount.toLocaleString('en-IN')} payment`}
          </button>
        </div>
      </form>

      <section className="section">
        <SectionHead icon={Clock} title="Deposit history" sub="Recent top-up requests" />
        {loadingHistory ? (
          <Loader label="History load ho rahi hai…" />
        ) : history.length === 0 ? (
          <EmptyState icon={Clock} title="Koi deposit nahi" text="Pehla top-up karte hi yahan status dikhne lagega." />
        ) : (
          <div className="stack gap-8">
            {history.map((row) => (
              <div key={row.id} className="row-item">
                <span className={`row-ico ${row.status === 'approved' ? 'ok' : row.status === 'rejected' ? 'danger' : ''}`}>
                  {row.status === 'approved' ? <Check size={16} /> : row.status === 'rejected' ? <AlertCircle size={16} /> : <Clock size={16} />}
                </span>
                <span className="row-main">
                  <span className="row-title">{row.coins_requested} coins · ₹{row.amount_paid}</span>
                  <span className="row-sub truncate">UTR {row.utr} · {fmtDate(row.created_at)}</span>
                </span>
                <StatusPill status={row.status === 'approved' ? 'done' : row.status === 'rejected' ? 'failed' : 'pending'} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
