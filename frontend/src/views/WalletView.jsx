import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Coins, QrCode, Copy, Check, Upload, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';

export default function WalletView() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [paymentSettings, setPaymentSettings] = useState({ upi_id: '', upi_qr_image: '', coin_rate: '1' });
  const [selectedAmt, setSelectedAmt] = useState(250);
  const [customCoins, setCustomCoins] = useState(250);
  const [utr, setUtr] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/settings/payment')
      .then(r => r.json())
      .then(data => {
        if (data) setPaymentSettings(data);
      })
      .catch(() => {});
  }, []);

  const rate = parseFloat(paymentSettings.coin_rate) || 1;
  const inrAmount = Math.round(customCoins * rate);

  const handleCopyUpi = () => {
    if (!paymentSettings.upi_id) return;
    navigator.clipboard.writeText(paymentSettings.upi_id);
    setCopied(true);
    addToast('UPI ID copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePresetSelect = (coins) => {
    setSelectedAmt(coins);
    setCustomCoins(coins);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!utr.trim()) {
      addToast('Please enter the 12-digit UTR number', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('coins_requested', customCoins);
      formData.append('amount_paid', inrAmount);
      formData.append('utr', utr.trim());
      if (screenshotFile) {
        formData.append('screenshot', screenshotFile);
      }

      const res = await fetch('/api/coins/request', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment');

      addToast('Payment submitted! Admin will verify and credit coins.', 'success');
      setUtr('');
      setScreenshotFile(null);
      refreshUser();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
          Coin Wallet & Top-Up
        </h2>
        <p style={{ fontSize: 14, color: 'var(--dim)', marginTop: 4 }}>
          Purchase coins to build and deploy Flutter apps
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Left: Balance Card & Preset Amounts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Balance Widget */}
          <div className="glass-panel" style={{
            padding: 28,
            background: 'linear-gradient(135deg, rgba(30, 22, 65, 0.9) 0%, rgba(16, 12, 38, 0.95) 100%)',
            border: '1px solid rgba(255, 203, 92, 0.3)'
          }}>
            <div style={{ fontSize: 13, color: 'var(--dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CURRENT COIN BALANCE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 10 }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--gold)', fontFamily: "'Orbitron', sans-serif" }}>
                {user?.coins || 0}
              </div>
              <span style={{ fontSize: 18, color: 'var(--dim)' }}>COINS</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--dim)', marginTop: 8 }}>
              ≈ ₹{(user?.coins || 0) * rate} INR (Exchange rate: 1 Coin = ₹{rate})
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 12 }}>
              SELECT RECHARGE PACKAGE
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[100, 250, 500, 1000].map(amt => (
                <div
                  key={amt}
                  onClick={() => handlePresetSelect(amt)}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: selectedAmt === amt ? 'rgba(139, 124, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                    border: selectedAmt === amt ? '1px solid var(--violet)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{amt} Coins</div>
                  <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 4 }}>₹{amt * rate}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                CUSTOM COINS AMOUNT
              </label>
              <input
                type="number"
                className="input-field"
                value={customCoins}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setCustomCoins(val);
                  setSelectedAmt(val);
                }}
                min={10}
              />
            </div>
          </div>
        </div>

        {/* Right: Payment Instructions & UTR submission */}
        <div className="glass-panel" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
            Instant UPI Payment
          </h3>

          {/* QR and UPI ID */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.4)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 20
          }}>
            {paymentSettings.upi_qr_image ? (
              <img
                src={`/uploads/${paymentSettings.upi_qr_image}`}
                alt="UPI QR Code"
                style={{ width: 170, height: 170, borderRadius: 10, background: '#fff', padding: 8 }}
              />
            ) : (
              <div style={{
                width: 170,
                height: 170,
                borderRadius: 10,
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <QrCode size={110} color="#000" />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--dim)' }}>UPI ID:</span>
              <strong style={{ color: '#fff', fontSize: 14, fontFamily: "'JetBrains Mono', monospace" }}>
                {paymentSettings.upi_id || 'Not configured'}
              </strong>
              {paymentSettings.upi_id && (
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  style={{
                    background: 'rgba(139, 124, 255, 0.2)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 8px',
                    color: 'var(--violet)',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                12-DIGIT UTR / REFERENCE NUMBER
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 428192837192"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                PAYMENT SCREENSHOT (OPTIONAL)
              </label>
              <input
                type="file"
                accept="image/*"
                className="input-field"
                onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
              />
            </div>

            <button
              type="submit"
              className="btn-gold"
              style={{ marginTop: 8, padding: 12 }}
              disabled={submitting}
            >
              {submitting ? 'Submitting Verification...' : `Submit Payment of ₹${inrAmount}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
