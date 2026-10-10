import React, { useEffect, useMemo, useRef, useState } from 'react';
import {ImageIcon, Link2, BadgeCheck, Info, ClipboardPaste, Trash2, Rocket, IndianRupee as Coins, CircleCheck, TriangleAlert, Receipt, X} from 'lucide-react';
import {Sparkles, Wallet, Globe, ArrowRight, ArrowLeft, Check, ShieldCheck, Layers, Smartphone} from './AnimatedIcon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from './Toast';
import { Sheet, Notice, Spinner } from './ui';
import { orders as ordersApi, store } from '../lib/api';
import { getMediaUrl } from '../utils/media';
import sfx from '../lib/sfx';

const MODES = [
  { key: 'real', label: 'Real app', hint: 'Sirf main APK — aapke register link ke saath', tag: 'Primary', tone: '' },
  { key: 'both', label: 'Real + Fake', hint: 'Dono APK — main + backup fake build', tag: 'Popular', tone: 'gold' },
  { key: 'fake', label: 'Fake only', hint: 'Sirf backup APK — main link chhupane ke liye', tag: 'Backup', tone: 'info' }
];

// Har style ka apna font look — taaki naam likhte hi input box me bhi wahi
// style dikhe — aur style chips me build wala styled (Unicode) sample dikhta hai.
const STYLE_CSS = {
  bold: { fontWeight: 900, letterSpacing: '0.3px' },
  sansbold: { fontWeight: 800, fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif', letterSpacing: '-0.2px' },
  smallcaps: { fontVariant: 'small-caps', fontWeight: 700, letterSpacing: '0.6px' },
  sans: { fontWeight: 500, fontFamily: '"Helvetica Neue", Arial, sans-serif', letterSpacing: '0.2px' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontWeight: 700, letterSpacing: '0.4px' }
};

const DEPOSIT_CHIPS = [100, 200, 300, 500, 1000];
const MAX_ICON_BYTES = 5 * 1024 * 1024;

function isHttpUrl(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  try {
    const url = new URL(v);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function hostOf(value) {
  try {
    return new URL(String(value).trim()).host;
  } catch (err) {
    return '';
  }
}

/* ── URL input: icon + paste + clear + live validation ── */
function UrlField({ icon: Icon = Link2, label, value, onChange, placeholder, hint, required, tone = '' }) {
  const { addToast } = useToast();
  const valid = isHttpUrl(value);
  const typed = String(value || '').trim().length > 0;

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        sfx.pop();
      }
    } catch (err) {
      addToast('Clipboard se paste nahi ho paya — manually paste karein', 'error');
    }
  };

  return (
    <div className="field">
      <span className="label">
        {label} {required && '*'}
        {typed && (
          <span className={`url-badge ${valid ? 'ok' : 'warn'}`}>
            {valid ? <CircleCheck size={11} /> : <TriangleAlert size={11} />}
            {valid ? 'Link theek hai' : 'http(s) link daalein'}
          </span>
        )}
      </span>
      <div className={`url-field ${tone}`}>
        <span className="url-ico"><Icon size={15} /></span>
        <input
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
        />
        {typed && (
          <button type="button" className="url-btn" onClick={() => { onChange(''); }} aria-label="Clear">
            <X size={14} />
          </button>
        )}
        <button type="button" className="url-btn paste" onClick={paste} aria-label="Paste">
          <ClipboardPaste size={14} />
          <span>Paste</span>
        </button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export default function BuildWizardModal({ design, isOpen, onClose, onOrderCreated, onOpenWallet }) {
  const { user, refreshUser } = useAuth();
  const { config, refreshOrders } = useStore();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState('');
  const [fontStyle, setFontStyle] = useState('bold');
  const [fonts, setFonts] = useState([]);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [dragging, setDragging] = useState(false);

  const [mode, setMode] = useState('real');
  const [registerUrl, setRegisterUrl] = useState('');
  const [fakeRegisterUrl, setFakeRegisterUrl] = useState('');
  const [minDeposit, setMinDeposit] = useState(300);

  const [submitting, setSubmitting] = useState(false);
  const fontReq = useRef(0);
  const paymentKey = useRef(crypto.randomUUID());

  const fakePrice = Number(design?.fake_price_coins || config?.addon_fake_price || 5);
  const realPrice = Number(design?.price_coins || 0);

  const subtotal = useMemo(() => {
    if (!design) return 0;
    if (mode === 'fake') return fakePrice;
    if (mode === 'both') return realPrice + fakePrice;
    return realPrice;
  }, [design, mode, fakePrice, realPrice]);

  const resellerPercent = user?.reseller?.status === 'active' ? Number(user.reseller.apk_percent) : 0;
  const total = Math.round(Math.round(subtotal * 100) * (100-resellerPercent)/100)/100;
  const balance = Number(user?.coins || 0);
  const short = balance < total;

  useEffect(() => {
    if (!isOpen || !design) return;
    setStep(1);
    paymentKey.current = crypto.randomUUID();
    setAppName('');
    setIconFile(null);
    setIconPreview(null);
    setDragging(false);
    setMode('real');
    setRegisterUrl('');
    setFakeRegisterUrl('');
    setMinDeposit(300);
  }, [design, isOpen]);

  // Font style samples server se aate hain (wahi Unicode mapping jo build me
  // app ke naam par lagti hai) — taaki preview bilkul final jaisa dikhe.
  useEffect(() => {
    if (!isOpen) return;
    const reqId = fontReq.current + 1;
    fontReq.current = reqId;
    store.fontStyles(appName || 'App Name')
      .then((rows) => {
        if (fontReq.current !== reqId) return;
        if (Array.isArray(rows) && rows.length) {
          setFonts(rows);
          if (!rows.some((r) => r.key === fontStyle)) setFontStyle(rows[0].key);
        }
      })
      .catch(() => setFonts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appName]);

  if (!isOpen || !design) return null;

  const activeFont = fonts.find((f) => f.key === fontStyle);
  const styledName = (appName.trim() ? (activeFont?.sample || appName) : '').trim();
  const styleCss = STYLE_CSS[fontStyle] || STYLE_CSS.bold;
  const activeMode = MODES.find((m) => m.key === mode) || MODES[0];
  const deposit = parseInt(minDeposit, 10) || 300;

  const takeIcon = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type || '')) {
      addToast('Icon PNG ya JPG hona chahiye', 'error');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      addToast('Icon 5 MB se chhota rakhein', 'error');
      return;
    }
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
    sfx.pop();
  };

  const onIcon = (e) => {
    takeIcon(e.target.files?.[0]);
    e.target.value = '';
  };

  const clearIcon = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIconFile(null);
    setIconPreview(null);
  };

  const validateStep1 = () => appName.trim().length >= 2;
  const validateStep2 = () => {
    if (mode === 'fake') return isHttpUrl(fakeRegisterUrl);
    if (!isHttpUrl(registerUrl)) return false;
    if (mode === 'both') return isHttpUrl(fakeRegisterUrl);
    return true;
  };

  const goStep = (next) => {
    sfx.step();
    setStep(next);
  };

  const submit = async () => {
    if (short) {
      addToast('balance kam hain — wallet me add fund karein', 'error');
      onOpenWallet?.();
      return;
    }
    sfx.build();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('design_id', design.id);
      fd.append('expected_total', String(total));
      fd.append('request_key', paymentKey.current);
      fd.append('app_name', appName.trim());
      fd.append('app_name_style', fontStyle);
      // App name aur brand title ek hi hai — server dono field same value se bharta hai.
      fd.append('brand_title', appName.trim());
      fd.append('min_deposit', String(deposit));
      fd.append('build_mode', mode);
      if (mode !== 'fake') fd.append('register_url', registerUrl.trim());
      if (mode !== 'real') fd.append('fake_register_url', fakeRegisterUrl.trim());
      if (mode === 'both') fd.append('fake_addon', 'true');
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

  const stepMeta = [
    { n: 1, label: 'App details' },
    { n: 2, label: 'Build mode & links' },
    { n: 3, label: 'Payment & build' }
  ];

  const modePrice = (key) => {
    if (key === 'fake') return `₹${fakePrice}`;
    if (key === 'both') return `₹${realPrice + fakePrice}`;
    return `₹${realPrice}`;
  };

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
      <div className="wiz-now">
        <b>Step {step}/3</b> · {stepMeta[step - 1].label}
      </div>

      {/* ══════════════ Step 1 — app details + icon ══════════════ */}
      {step === 1 && (
        <div className="stack gap-12">
          <div className="wiz-design">
            <span className="wiz-design-ico">
              {design.preview_image
                ? <img src={getMediaUrl(design.preview_image)} alt="" />
                : <Layers size={20} />}
            </span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row-title truncate">{design.name}</span>
              <span className="row-sub">Real ₹{realPrice} · Fake ₹{fakePrice}</span>
            </span>
          </div>

          {/* Naam — input khud chuni hui style me render hota hai */}
          <div className="field">
            <span className="label">
              App name *
              <span className={`name-count${appName.trim().length >= 2 ? ' ok' : ''}`}>{appName.trim().length}/28</span>
            </span>
            <div className="name-field">
              <input
                className="input name-input"
                style={styleCss}
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. MAAN WIN VIP"
                maxLength={28}
                autoFocus
              />
              {appName && (
                <button type="button" className="name-clear" onClick={() => setAppName('')} aria-label="Clear name">
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="hint">
              Launcher aur app ke andar dono jagah yahi naam dikhega{appName.trim().length < 2 ? ' — kam se kam 2 letters likhein.' : '.'}
            </span>
          </div>

          {fonts.length > 0 && (
            <div className="field">
              <span className="label">Name style</span>
              <div className="style-grid">
                {fonts.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`style-chip ${fontStyle === f.key ? 'active' : ''}`}
                    data-sfx="select"
                    onClick={() => setFontStyle(f.key)}
                  >
                    <span className="style-sample" style={STYLE_CSS[f.key] || undefined}>{f.sample}</span>
                    <span className="style-label">
                      {fontStyle === f.key && <Check size={11} />}
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
              <span className="hint">Ye style app ke naam par lagta hai (app ke andar ka text same rehta hai).</span>
            </div>
          )}

          <div className="field">
            <span className="label">App icon</span>
            <div
              className={`icon-pick${iconPreview ? ' has-img' : ''}${dragging ? ' drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                takeIcon(e.dataTransfer?.files?.[0]);
              }}
            >
              <label className="icon-pick-tap">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onIcon} hidden />
                <span className="icon-pick-box">
                  {iconPreview ? <img src={iconPreview} alt="" /> : <ImageIcon size={18} />}
                </span>
                <span className="icon-pick-meta">
                  <span className="row-title">{iconPreview ? 'Icon ready' : 'Upload icon'}</span>
                  <span className="row-sub">PNG / JPG · 512×512</span>
                </span>
                {!iconPreview && <span className="icon-pick-cta">Choose</span>}
              </label>
              {iconPreview && (
                <button type="button" className="btn btn-ghost btn-xs danger" onClick={clearIcon} aria-label="Remove icon">
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <span className="hint">Blank chhodein to hack ka default icon lagega.</span>
          </div>
        </div>
      )}

      {/* ══════════════ Step 2 — mode + links ══════════════ */}
      {step === 2 && (
        <div className="stack gap-12">
          <div className="field">
            <span className="label">Build mode</span>
            <div className="stack gap-8">
              {MODES.map((m) => {
                const active = mode === m.key;
                const Icon = m.key === 'real' ? BadgeCheck : m.key === 'fake' ? Globe : Layers;
                return (
                  <button
                    key={m.key}
                    type="button"
                    className={`row-item mode-card${active ? ' active' : ''}`}
                    data-sfx="select"
                    onClick={() => setMode(m.key)}
                  >
                    <span className={`row-ico ${m.tone}`}><Icon size={17} /></span>
                    <span className="row-main">
                      <span className="row-title">
                        {m.label}
                        <span className={`chip mode-tag ${m.tone ? 'chip-' + (m.tone === 'gold' ? 'gold' : m.tone) : ''}`}>{m.tag}</span>
                      </span>
                      <span className="row-sub">{m.hint}</span>
                      <span className="mode-price"><Coins size={11} /> {modePrice(m.key)}</span>
                    </span>
                    <span className={`mode-check${active ? ' on' : ''}`}>{active && <Check size={13} />}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="wiz-summary">
            <Receipt size={14} />
            <span>
              {mode === 'real' && '1 APK banega — main app, aapke register link ke saath.'}
              {mode === 'both' && '2 APK banenge (main + backup) — dono ka data alag rehta hai, mix nahi hota.'}
              {mode === 'fake' && '1 APK banega (sirf backup) — register button pe main link chhupa rehta hai.'}
            </span>
          </div>

          {mode !== 'fake' && (
            <UrlField
              icon={Link2}
              label="Register URL"
              required
              value={registerUrl}
              onChange={setRegisterUrl}
              placeholder="https://site.com/#/register?invitationCode=..."
              hint="Isi link se app ke andar register button kaam karega."
            />
          )}

          {mode !== 'real' && (
            <>
              <UrlField
                icon={Globe}
                label="Fake register URL"
                required
                value={fakeRegisterUrl}
                onChange={setFakeRegisterUrl}
                placeholder="https://backup-site.com/#/register?invitationCode=..."
                hint="Backup build ka data alag rehta hai — main app se mix nahi hota."
              />
              {mode === 'both' && isHttpUrl(registerUrl) && fakeRegisterUrl !== registerUrl && (
                <button
                  type="button"
                  className="btn btn-soft btn-xs"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => setFakeRegisterUrl(registerUrl)}
                >
                  <ClipboardPaste size={12} /> Main link jaisa hi rakhein
                </button>
              )}
            </>
          )}

          <div className="field">
            <span className="label">Minimum deposit (₹)</span>
            <div className="url-field money">
              <span className="url-ico">₹</span>
              <input
                className="input"
                type="number"
                min={0}
                value={minDeposit}
                onChange={(e) => setMinDeposit(e.target.value)}
                placeholder="300"
              />
            </div>
            <div className="flex-row gap-6" style={{ flexWrap: 'wrap', marginTop: 8 }}>
              {DEPOSIT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pill sm${deposit === c ? ' active' : ''}`}
                  data-sfx="select"
                  onClick={() => setMinDeposit(String(c))}
                >
                  ₹{c}
                </button>
              ))}
            </div>
            <span className="hint">App ke andar deposit page par minimum amount yahi dikhega.</span>
          </div>
        </div>
      )}

      {/* ══════════════ Step 3 — payment + build ══════════════ */}
      {step === 3 && (
        <div className="stack gap-12">
          <div className="checklist">
            <span className="check-item ok"><Check size={11} /> {appName.trim()}</span>
            <span className="check-item ok"><Check size={11} /> {activeFont?.label || 'Bold'} style</span>
            <span className={`check-item ${registerUrl || mode === 'fake' ? 'ok' : 'warn'}`}>
              <Check size={11} /> {mode === 'fake' ? hostOf(fakeRegisterUrl) || 'Fake link' : hostOf(registerUrl) || 'Register link'}
            </span>
            <span className="check-item ok"><Check size={11} /> {activeMode.label}</span>
          </div>

          <div className="card card-pad stack gap-10">
            <div className="flex-row gap-10">
              <span className="row-ico" style={{ width: 40, height: 40, borderRadius: 13, overflow: 'hidden', background: 'rgba(0,0,0,.35)' }}>
                {iconPreview || design.preview_image
                  ? <img src={iconPreview || getMediaUrl(design.preview_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Layers size={18} />}
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row-title truncate" style={styleCss}>{styledName}</div>
                <div className="row-sub truncate">{design.name} · {iconPreview ? 'custom icon' : 'hack icon'} · min ₹{deposit}</div>
              </div>
            </div>

            <div className="divider" />

            <div className="flex-row between">
              <span className="dim">Hack ({activeMode.label})</span>
              <b>{mode === 'fake' ? `₹${fakePrice}` : `₹${realPrice}`}</b>
            </div>
            {mode === 'both' && (
              <div className="flex-row between">
                <span className="dim">Fake APK add-on</span>
                <b>+₹{fakePrice}</b>
              </div>
            )}
            <div className="divider" />
            <div className="flex-row between" style={{ fontSize: 16 }}>
              <span style={{ fontWeight: 700 }}>Total payable{resellerPercent>0&&<small style={{display:'block',fontSize:11,color:'var(--ok)'}}>Reseller {resellerPercent}% OFF · save ₹{(subtotal-total).toFixed(2)}</small>}</span>
              <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
                ₹{total}
              </b>
            </div>
            <div className="flex-row between">
              <span className="dim">Build ke baad balance</span>
              <b style={{ color: short ? 'var(--danger)' : 'var(--ok)' }}>₹{(balance - total).toFixed(2)}</b>
            </div>
          </div>

          <div className={`trust-strip`} style={short ? { background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' } : undefined}>
            {short ? <Info size={14} color="var(--danger)" /> : <ShieldCheck size={14} color="var(--ok)" />}
            <span>
              Wallet balance <b>₹{balance}</b>
              {short
                ? ' — balance kam hai, pehle add fund karein.'
                : ' — build turant queue me chala jaayega, download ready hone par milega.'}
            </span>
          </div>

          {!short && (
            <div className="wiz-note">
              <Rocket size={13} />
              <span>Amount wallet se deduct hoga · build queue me jaa kar turant shuru ho jaata hai.</span>
            </div>
          )}

          {short && (
            <button className="btn btn-gold btn-block" data-sfx="coin" onClick={onOpenWallet}>
              <Wallet size={15} /> Add fund
            </button>
          )}
        </div>
      )}

      <div className="sheet-foot">
        {step > 1 ? (
          <button className="btn btn-soft" data-sfx="off" onClick={() => goStep(step - 1)} disabled={submitting}>
            <ArrowLeft size={15} /> Back
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        )}

        {step < 3 ? (
          <button
            className="btn btn-primary grow"
            data-sfx="off"
            disabled={step === 1 ? !validateStep1() : !validateStep2()}
            onClick={() => goStep(step + 1)}
          >
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button className="btn btn-primary grow" data-sfx="off" onClick={submit} disabled={submitting || short}>
            {submitting ? <Spinner /> : <Rocket size={15} />}
            {submitting ? 'Starting build…' : `Pay ₹${total} & build${resellerPercent ? ` · ${resellerPercent}% reseller OFF` : ''}`}
          </button>
        )}
      </div>
    </Sheet>
  );
}
