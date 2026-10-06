import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, ShieldCheck, Wallet,
  ImageIcon, Link2, Globe, Layers, BadgeCheck, Info, ClipboardPaste,
  Trash2, Rocket, Coins, CircleCheck, TriangleAlert, Smartphone, Receipt, X
} from 'lucide-react';
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
// style dikhe (styled Unicode label preview alag se launcher tile me aata hai).
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

  const fakePrice = Number(design?.fake_price_coins || config?.addon_fake_price || 5);
  const realPrice = Number(design?.price_coins || 0);

  const subtotal = useMemo(() => {
    if (!design) return 0;
    if (mode === 'fake') return fakePrice;
    if (mode === 'both') return realPrice + fakePrice;
    return realPrice;
  }, [design, mode, fakePrice, realPrice]);

  const total = subtotal;
  const balance = Number(user?.coins || 0);
  const short = balance < total;
  const rate = parseFloat(config?.coin_rate || 1) || 1;

  useEffect(() => {
    if (!isOpen || !design) return;
    setStep(1);
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
  // launcher label par lagti hai) — taaki preview bilkul final jaisa dikhe.
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
      addToast('Coins kam hain — wallet me add fund karein', 'error');
      onOpenWallet?.();
      return;
    }
    sfx.build();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('design_id', design.id);
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
    if (key === 'fake') return `${fakePrice} coins`;
    if (key === 'both') return `${realPrice + fakePrice} coins`;
    return `${realPrice} coins`;
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
              <span className="row-sub">Real {realPrice} coins · Fake {fakePrice} coins</span>
            </span>
          </div>

          {/* Naam + live launcher preview — style chunte hi dono me turant dikhta hai */}
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

          <div className="launcher-card">
            <div className="launcher-tile">
              <span className="launcher-icon">
                {iconPreview || design.preview_image
                  ? <img src={iconPreview || getMediaUrl(design.preview_image)} alt="" />
                  : <Layers size={26} />}
              </span>
              <span className="launcher-label" style={styleCss}>{styledName || 'App Name'}</span>
            </div>
            <div className="launcher-copy">
              <div className="row-title"><Smartphone size={13} style={{ verticalAlign: -2 }} /> Launcher preview</div>
              <div className="row-sub" style={{ marginTop: 4 }}>
                Phone ke home screen par app aisa dikhega. Style badalne par label turant update hota hai.
              </div>
              <div className="flex-row gap-6" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                <span className="chip chip-ok"><Check size={11} /> {activeFont?.label || 'Bold'}</span>
                <span className="chip">{iconPreview ? 'Custom icon' : 'Template icon'}</span>
              </div>
            </div>
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
              <span className="hint">Ye style launcher par app ke naam me lagta hai (app ke andar ka text same rehta hai).</span>
            </div>
          )}

          <div className="field">
            <span className="label">App icon</span>
            <label
              className={`icon-drop${iconPreview ? ' has-img' : ''}${dragging ? ' drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                takeIcon(e.dataTransfer?.files?.[0]);
              }}
            >
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onIcon} hidden />
              {iconPreview ? (
                <>
                  <img src={iconPreview} alt="" />
                  <span className="icon-drop-bar">
                    <span className="icon-drop-hint"><ImageIcon size={13} /> Change</span>
                    <button type="button" className="icon-drop-x" onClick={clearIcon} aria-label="Remove icon">
                      <Trash2 size={13} /> Remove
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <span className="icon-drop-ico"><ImageIcon size={22} /></span>
                  <b>Upload icon</b>
                  <span>PNG / JPG · 512×512 · tap ya drag-drop</span>
                </>
              )}
            </label>
            <span className="hint">Blank chhodein to template ka default icon lagega.</span>
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
              {mode === 'real' && '1 APK banega (main) · apna live-link firebase path.'}
              {mode === 'both' && '2 APK banenge (main + fake) · dono ka firebase path alag rehta hai — data mix nahi hota.'}
              {mode === 'fake' && '1 APK banega (sirf fake) · register button pe main link chhupa rehta hai.'}
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
                hint="Fake build ka apna firebase path hota hai — data mix nahi hota."
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
                <div className="row-sub truncate">{design.name} · {iconPreview ? 'custom icon' : 'template icon'} · min ₹{deposit}</div>
              </div>
            </div>

            <div className="divider" />

            <div className="flex-row between">
              <span className="dim">Template ({activeMode.label})</span>
              <b>{mode === 'fake' ? `${fakePrice} coins` : `${realPrice} coins`}</b>
            </div>
            {mode !== 'real' && (
              <div className="flex-row between">
                <span className="dim">Fake APK add-on</span>
                <b>+{fakePrice} coins</b>
              </div>
            )}
            <div className="divider" />
            <div className="flex-row between" style={{ fontSize: 16 }}>
              <span style={{ fontWeight: 700 }}>Total payable</span>
              <b style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
                {total} coins <small style={{ color: 'var(--muted)', fontWeight: 600 }}>≈ ₹{Math.round(total * rate)}</small>
              </b>
            </div>
            <div className="flex-row between">
              <span className="dim">Build ke baad balance</span>
              <b style={{ color: short ? 'var(--danger)' : 'var(--ok)' }}>{balance - total} coins</b>
            </div>
          </div>

          <div className={`trust-strip`} style={short ? { background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' } : undefined}>
            {short ? <Info size={14} color="var(--danger)" /> : <ShieldCheck size={14} color="var(--ok)" />}
            <span>
              Wallet balance <b>{balance} coins</b>
              {short
                ? ' — itne coins nahi hain, pehle add fund karein.'
                : ' — build turant queue me chala jaayega, download ready hone par milega.'}
            </span>
          </div>

          {!short && (
            <div className="wiz-note">
              <Rocket size={13} />
              <span>Coins abhi kat jaayenge · build queue me jaa kar turant shuru ho jaata hai.</span>
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
            {submitting ? 'Starting build…' : `Pay ${total} coins & build`}
          </button>
        )}
      </div>
    </Sheet>
  );
}
