import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { X, Sparkles, Upload, Tag, ArrowRight, ArrowLeft, Check, AlertTriangle, ShieldCheck } from 'lucide-react';

const FONT_STYLES = [
  { key: 'bold', label: 'Bold', preview: '𝗕𝗢𝗟𝗗' },
  { key: 'sansbold', label: 'Bold Sans', preview: 'Bold Sans' },
  { key: 'smallcaps', label: 'Small Caps', preview: 'sᴍᴀʟʟ ᴄᴀᴘs' },
  { key: 'sans', label: 'Sans Serif', preview: 'Sans Serif' },
  { key: 'mono', label: 'Monospace', preview: '𝙼𝚘𝚗𝚘' }
];

export default function BuildWizardModal({ design, isOpen, onClose, onOrderCreated, onOpenWallet }) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [fontStyle, setFontStyle] = useState('bold');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);

  const [mode, setMode] = useState('real'); // 'real' | 'fake' | 'both'
  const [registerUrl, setRegisterUrl] = useState('');
  const [fakeRegisterUrl, setFakeRegisterUrl] = useState('');
  const [minDeposit, setMinDeposit] = useState(300);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponChecking, setCouponChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (design) {
      setStep(1);
      setAppName('');
      setIconFile(null);
      setIconPreview(null);
      setRegisterUrl('');
      setFakeRegisterUrl('');
      setMinDeposit(300);
      setCouponCode('');
      setCouponDiscount(0);
    }
  }, [design]);

  if (!isOpen || !design) return null;

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, design_id: design.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid coupon');
      setCouponDiscount(data.discount || 0);
      addToast(`Coupon applied! Saved ${data.discount} coins`, 'success');
    } catch (err) {
      setCouponDiscount(0);
      addToast(err.message, 'error');
    } finally {
      setCouponChecking(false);
    }
  };

  // Pricing calculation
  const basePrice = mode === 'fake'
    ? (design.fake_price_coins || 5)
    : mode === 'both'
    ? (design.price_coins || 10) + (design.fake_price_coins || 5)
    : (design.price_coins || 10);

  const finalCost = Math.max(0, basePrice - couponDiscount);
  const userCoins = user?.coins || 0;
  const hasEnoughCoins = userCoins >= finalCost;

  const handleCreateOrder = async () => {
    if (!hasEnoughCoins) {
      addToast('Insufficient coin balance. Please recharge.', 'error');
      if (onOpenWallet) onOpenWallet();
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('design_id', design.id);
      formData.append('app_name', appName.trim() || 'App');
      formData.append('app_name_style', fontStyle);
      formData.append('register_url', registerUrl.trim());
      formData.append('min_deposit', minDeposit);
      formData.append('build_engine', 'flutter'); // Trigger modern Flutter engine

      if (mode === 'both' || mode === 'fake') {
        formData.append('fake_register_url', fakeRegisterUrl.trim() || registerUrl.trim());
      }
      if (couponCode.trim()) {
        formData.append('coupon_code', couponCode.trim());
      }
      if (iconFile) {
        formData.append('icon', iconFile);
      }

      const res = await fetch('/api/order', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start build');

      addToast('Build submitted successfully! Compiling Flutter APK...', 'success');
      onOrderCreated(data.order_id || data.id);
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 580,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 28,
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 8,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#aaa',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Wizard Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--violet)', fontSize: 12, fontWeight: 700 }}>
            <Sparkles size={14} />
            <span>FLUTTER APK BUILD WIZARD — STEP {step} OF 3</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4 }}>
            Build: {design.name}
          </h2>
        </div>

        {/* Step 1: App Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                APP NAME (DISPLAY NAME)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Thunder Win, Mega Predictor"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                maxLength={30}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 8 }}>
                LAUNCHER FONT STYLE (HOMESCREEN)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                {FONT_STYLES.map(fs => (
                  <div
                    key={fs.key}
                    onClick={() => setFontStyle(fs.key)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      background: fontStyle === fs.key ? 'rgba(139, 124, 255, 0.22)' : 'rgba(255,255,255,0.04)',
                      border: fontStyle === fs.key ? '1px solid var(--violet)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fs.preview}</div>
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{fs.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 8 }}>
                APP ICON (PNG / JPG)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px dashed var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  {iconPreview ? (
                    <img src={iconPreview} alt="Icon Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Upload size={20} color="var(--dim)" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    id="wizard-icon-input"
                    style={{ display: 'none' }}
                    onChange={handleIconChange}
                  />
                  <label htmlFor="wizard-icon-input" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 13 }}>
                    Choose App Icon
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
                    Auto-resized to HDPI, XHDPI, XXHDPI, XXXHDPI
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!appName.trim()) {
                    addToast('Please enter an app name', 'error');
                    return;
                  }
                  setStep(2);
                }}
              >
                <span>Continue to Links</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Game Links & Rules */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Mode selection */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 8 }}>
                TARGET APK TYPE
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { key: 'real', title: 'Real APK', price: design.price_coins || 10 },
                  { key: 'fake', title: 'Fake APK', price: design.fake_price_coins || 5 },
                  { key: 'both', title: 'Both APKs', price: (design.price_coins || 10) + (design.fake_price_coins || 5) }
                ].map(m => (
                  <div
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: mode === m.key ? 'rgba(139, 124, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: mode === m.key ? '1px solid var(--violet)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>{m.price} Coins</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                REGISTER / INVITE URL
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://example.com/#/register?inviteCode=..."
                value={registerUrl}
                onChange={(e) => setRegisterUrl(e.target.value)}
                required
              />
              <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>
                Supports Dhani Win, TS777, Wingo, and all custom platforms
              </p>
            </div>

            {(mode === 'fake' || mode === 'both') && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                  FAKE SITE REGISTER URL (OPTIONAL)
                </label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://fakesite.com/register (optional)"
                  value={fakeRegisterUrl}
                  onChange={(e) => setFakeRegisterUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                MINIMUM DEPOSIT GATE (₹)
              </label>
              <input
                type="number"
                className="input-field"
                value={minDeposit}
                onChange={(e) => setMinDeposit(parseInt(e.target.value, 10) || 100)}
                min={50}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!registerUrl.trim()) {
                    addToast('Please enter the register URL', 'error');
                    return;
                  }
                  setStep(3);
                }}
              >
                <span>Continue to Summary</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Coupon & Cost Breakdown */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Coupon field */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                HAVE A COUPON CODE?
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter promo code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleValidateCoupon}
                  disabled={couponChecking || !couponCode.trim()}
                >
                  <Tag size={15} />
                  <span>Apply</span>
                </button>
              </div>
            </div>

            {/* Summary Box */}
            <div style={{
              background: 'rgba(10, 8, 24, 0.8)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 18
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>
                <span>App Name</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{appName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>
                <span>Selected Engine</span>
                <span style={{ fontWeight: 700, color: '#4df5b4' }}>Flutter 3.x (Obfuscated)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>
                <span>Live Link Sync</span>
                <span style={{ color: '#6ec3ff' }}>Enabled (Firebase RTDB)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>
                <span>Base Price</span>
                <span>{basePrice} Coins</span>
              </div>
              {couponDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ok)', marginBottom: 8 }}>
                  <span>Coupon Discount</span>
                  <span>-{couponDiscount} Coins</span>
                </div>
              )}
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Total Build Cost</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>{finalCost} Coins</span>
              </div>
            </div>

            {/* Wallet Balance Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 12,
              borderRadius: 12,
              background: hasEnoughCoins ? 'rgba(77, 245, 180, 0.1)' : 'rgba(255, 84, 112, 0.1)',
              border: `1px solid ${hasEnoughCoins ? 'rgba(77, 245, 180, 0.25)' : 'rgba(255, 84, 112, 0.25)'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasEnoughCoins ? (
                  <ShieldCheck size={18} color="var(--ok)" />
                ) : (
                  <AlertTriangle size={18} color="var(--danger)" />
                )}
                <span style={{ fontSize: 13, color: hasEnoughCoins ? 'var(--ok)' : 'var(--danger)' }}>
                  {hasEnoughCoins
                    ? `Balance Available (${userCoins} Coins)`
                    : `Insufficient Coins (${userCoins} Coins available)`}
                </span>
              </div>
              {!hasEnoughCoins && (
                <button
                  type="button"
                  className="btn-gold"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={onOpenWallet}
                >
                  Top Up
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateOrder}
                disabled={submitting || !hasEnoughCoins}
              >
                {submitting ? 'Initiating Build...' : 'Confirm & Build APK'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
