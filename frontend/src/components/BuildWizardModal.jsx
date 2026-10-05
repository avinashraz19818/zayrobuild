import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Upload, Tag, ArrowRight, ArrowLeft, Check, ShieldCheck, Wallet,
  ImageIcon, Link2, Globe, Layers, BadgeCheck, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from './Toast';
import { Sheet, Notice, Spinner } from './ui';
import { orders as ordersApi, store } from '../lib/api';
import { getMediaUrl } from '../utils/media';

const MODES = [
  { key: 'real', label: 'Real app', hint: 'Primary APK — aapke register link ke saath' },
  { key: 'both', label: 'Real + Fake', hint: 'Dono APK — main + backup fake build' },
  { key: 'fake', label: 'Fake only', hint: 'Sirf backup APK — main link ko chhupane ke liye' }
];

export default function BuildWizardModal({ design, isOpen, onClose, onOrderCreated, onOpenWallet }) {
  const { user, refreshUser } = useAuth();
  const { config, refreshOrders } = useStore();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [brandTitle, setBrandTitle] = useState('');
  const [fontStyle, setFontStyle] = useState('bold');
  const [fonts, setFonts] = useState([]);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);

  const [mode, setMode] = useState('real');
  const [registerUrl, setRegisterUrl] = useState('');
  const [fakeRegisterUrl, setFakeRegisterUrl] = useState('');
  const [minDeposit, setMinDeposit] = useState(300);

  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponBusy, setCouponBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fakePrice = Number(design?.fake_price_coins || config?.addon_fake_price || 5);

  const subtotal = useMemo(() => {
    if (!design) return 0;
    if (mode === 'fake') return fakePrice;
    if (mode === 'both') return Number(design.price_coins || 0) + fakePrice;
    return Number(design.price_coins || 0);
  }, [design, mode, fakePrice]);

  const total = Math.max(0, subtotal - discount);
  const balance = Number(user?.coins || 0);
  const short = balance < total;

  useEffect(() => {
    if (!isOpen || !design) return;
    setStep(1);
    setAppName('');
    setBrandTitle('');
    setIconFile(null);
    setIconPreview(null);
    setMode('real');
    setRegisterUrl('');
    setFakeRegisterUrl('');
    setMinDeposit(300);
    setCoupon('');
    setDiscount(0);
  }, [design, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    store.fontStyles(appName || 'App Name')
      .then((rows) => {
        if (Array.isArray(rows) && rows.length) {
          setFonts(rows);
          if (!rows.some((r) => r.key === fontStyle)) setFontStyle(rows[0].key);
        }
      })
      .catch(() => setFonts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appName]);

  if (!isOpen || !design) return null;

  const onIcon = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    try {
      const res = await ordersApi.coupon(coupon.trim(), { subtotal });
      // server subtotal param chahiye — api helper ke through bhej rahe hain
      setDiscount(Number(res?.discount || 0));
      addToast(`Coupon applied — ${res?.discount || 0} coins off`, 'success');
    } catch (err) {
      setDiscount(0);
      addToast(err.message || 'Invalid coupon', 'error');
    } finally {
      setCouponBusy(false);
    }
  };

  const validateStep1 = () => appName.trim().length >= 2;
  const validateStep2 = () => {
    if (mode === 'fake') return fakeRegisterUrl.trim().length > 4;
    if (!registerUrl.trim()) return false;
    if (mode === 'both') return fakeRegisterUrl.trim().length > 4;
    return true;
  };

  const submit = async () => {
    if (short) {
      addToast('Coins kam hain — wallet me add fund karein', 'error');
      onOpenWallet?.();
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('design_id', design.id);
      fd.append('app_name', appName.trim());
      fd.append('app_name_style', fontStyle);
      fd.append('brand_title', (brandTitle.trim() || appName.trim()));
      fd.append('min_deposit', String(parseInt(minDeposit, 10) || 300));
      fd.append('build_mode', mode);
      if (mode !== 'fake') fd.append('register_url', registerUrl.trim());
      if (mode !== 'real') fd.append('fake_register_url', fakeRegisterUrl.trim());
      if (mode === 'both') fd.append('fake_addon', 'true');
      if (coupon.trim()) fd.append('coupon_code', coupon.trim());
      if (iconFile) fd.append('icon', iconFile);

      const res = await ordersApi.create(fd);
      addToast('Build queue me chala gaya — ready hone par download milega', 'success');
      onOrderCreated?.(res?.orderId || res?.order_id || res?.id);
      await Promise.all([refreshUser(), refreshOrders()]);
      onClose?.();
    } catch (err) {
      addToast(err.message || 'Build start nahi ho paya', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFont = fonts.find((f) => f.key === fontStyle);

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={Sparkles}
      title={`Build ${design.name}`}
      subtitle="3 easy steps — app details, register link, payment"
      wide
    >
      <div className="steps">
        {[1, 2, 3].map((s) => <span key={s} className={`step ${step >= s ? 'done' : ''}`} />)}
      </div>

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div className="stack gap-12">
          <div className="flex-row gap-12">
            <span className="row-ico" style={{ width: 54, height: 54, borderRadius: 16, overflow: 'hidden', background: 'rgba(0,0,0,.35)' }}>
              {iconPreview || design.preview_image
                ? <img src={iconPreview || getMediaUrl(design.preview_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Layers size={22} />}
            </span>
            <div>
              <div className="row-title">{design.name}</div>
              <div className="row-sub">
                Real {design.price_coins} coins · Fake {fakePrice} coins
              </div>
            </div>
          </div>

          <div className="field">
            <span className="label">App name *</span>
            <input className="input" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g. MAAN WIN VIP" maxLength={28} />
            <span className="hint">Launcher par yahi naam dikhega. {appName ? `Preview: ${activeFont?.sample || appName}` : ''}</span>
          </div>

          {fonts.length > 0 && (
            <div className="field">
              <span className="label">Name style</span>
              <div className="pill-row" style={{ flexWrap: 'wrap', overflow: 'visible' }}>
                {fonts.map((f) => (
                  <button key={f.key} type="button" className={`pill ${fontStyle === f.key ? 'active' : ''}`} onClick={() => setFontStyle(f.key)}>
                    {f.sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <span className="label">Brand title (optional)</span>
            <input className="input" value={brandTitle} onChange={(e) => setBrandTitle(e.target.value)} placeholder="App ke andar dikhne wala title" maxLength={28} />
          </div>

          <div className="field">
            <span className="label">App icon</span>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={onIcon} />
            <span className="hint"><ImageIcon size={11} style={{ display: 'inline', verticalAlign: -1 }} /> PNG/JPG — square 512×512 best rehta hai. Blank chhodo to template ka default icon lagega.</span>
          </div>
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div className="stack gap-12">
          <div className="field">
            <span className="label">Build mode</span>
            <div className="stack gap-8">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className="row-item"
                  style={mode === m.key ? { boxShadow: 'inset 0 0 0 1px var(--line-2)', background: 'var(--brand-soft)' } : undefined}
                  onClick={() => setMode(m.key)}
                >
                  <span className={`row-ico ${m.key === 'fake' ? 'info' : m.key === 'both' ? 'gold' : ''}`}>
                    {m.key === 'real' ? <BadgeCheck size={17} /> : <Globe size={17} />}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{m.label}</span>
                    <span className="row-sub">{m.hint}</span>
                  </span>
                  {mode === m.key && <Check size={16} color="var(--brand-2)" />}
                </button>
              ))}
            </div>
          </div>

          {mode !== 'fake' && (
            <div className="field">
              <span className="label">Register URL *</span>
              <div className="search-wrap">
                <Link2 size={15} className="ico" />
                <input className="input" value={registerUrl} onChange={(e) => setRegisterUrl(e.target.value)} placeholder="https://site.com/register?ref=..." inputMode="url" />
              </div>
              <span className="hint">Isi link se app ke andar register button kaam karega. http(s) zaroori hai.</span>
            </div>
          )}

          {mode !== 'real' && (
            <div className="field">
              <span className="label">Fake register URL *</span>
              <div className="search-wrap">
                <Globe size={15} className="ico" />
                <input className="input" value={fakeRegisterUrl} onChange={(e) => setFakeRegisterUrl(e.target.value)} placeholder="https://backup-site.com/register?ref=..." inputMode="url" />
              </div>
              <span className="hint">Fake build ka apna firebase path hota hai — data mix nahi hota.</span>
            </div>
          )}

          <div className="field">
            <span className="label">Minimum deposit (₹)</span>
            <input className="input" type="number" min={0} value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
            <span className="hint">App ke andar deposit page par minimum amount yahi dikhega.</span>
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div className="stack gap-12">
          <div className="card card-pad stack gap-10">
            <div className="flex-row between">
              <span className="dim">Template</span>
              <b>{design.name}</b>
            </div>
            <div className="flex-row between">
              <span className="dim">Build mode</span>
              <b>{MODES.find((m) => m.key === mode)?.label}</b>
            </div>
            <div className="flex-row between">
              <span className="dim">App name</span>
              <b className="truncate" style={{ maxWidth: '60%' }}>{appName}</b>
            </div>
            <div className="divider" />
            <div className="flex-row between">
              <span className="dim">Subtotal</span>
              <b>{subtotal} coins</b>
            </div>
            {discount > 0 && (
              <div className="flex-row between">
                <span className="dim">Coupon discount</span>
                <b style={{ color: 'var(--ok)' }}>− {discount} coins</b>
              </div>
            )}
            <div className="divider" />
            <div className="flex-row between" style={{ fontSize: 16 }}>
              <span style={{ fontWeight: 700 }}>Total payable</span>
              <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{total} coins</b>
            </div>
          </div>

          <div className="field">
            <span className="label">Coupon code</span>
            <div className="flex-row gap-8">
              <input className="input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="SAVE10" />
              <button type="button" className="btn btn-soft" onClick={applyCoupon} disabled={couponBusy || !coupon.trim()}>
                {couponBusy ? <Spinner /> : <Tag size={14} />}
                Apply
              </button>
            </div>
          </div>

          <div className={`trust-strip`} style={short ? { background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' } : undefined}>
            {short ? <Info size={14} color="var(--danger)" /> : <ShieldCheck size={14} color="var(--ok)" />}
            <span>
              Wallet balance <b>{balance} coins</b>{short ? ' — itne coins nahi hain, pehle add fund karein.' : ' — build turant queue me chala jaayega.'}
            </span>
          </div>

          {short && (
            <button className="btn btn-gold btn-block" onClick={onOpenWallet}>
              <Wallet size={15} /> Add fund
            </button>
          )}
        </div>
      )}

      <div className="sheet-foot">
        {step > 1 ? (
          <button className="btn btn-soft" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        )}

        {step < 3 ? (
          <button
            className="btn btn-primary grow"
            disabled={step === 1 ? !validateStep1() : !validateStep2()}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button className="btn btn-primary grow" onClick={submit} disabled={submitting || short}>
            {submitting ? <Spinner /> : <Check size={15} />}
            {submitting ? 'Starting build…' : `Pay ${total} coins & build`}
          </button>
        )}
      </div>

      {step === 3 && total === 0 && (
        <Notice tone="ok">Coupon ne poori payment cover kar li — build free me chalega.</Notice>
      )}
    </Sheet>
  );
}
