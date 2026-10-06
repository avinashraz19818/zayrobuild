import React, { useEffect } from 'react';
import {
  X, Copy, Check, PackageOpen, Loader2, AlertCircle, CheckCircle2, Info, CircleAlert
} from 'lucide-react';
import { copyText, statusOf } from '../lib/api';

/* ─────────────────────────────  Sheet (modal)  ───────────────────────────── */
export function Sheet({ open, title, subtitle, icon: Icon, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="sheet" role="dialog" aria-modal="true" style={wide ? { maxWidth: 720 } : undefined}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="flex-row gap-10" style={{ alignItems: 'flex-start' }}>
            {Icon && (
              <span className="row-ico" style={{ width: 36, height: 36 }}>
                <Icon size={18} />
              </span>
            )}
            <div>
              <div className="sheet-title">{title}</div>
              {subtitle && <div className="sheet-sub">{subtitle}</div>}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────  States  ───────────────────────────── */
export function Loader({ label = 'Loading…' }) {
  return (
    <div className="center-pad">
      <Loader2 size={22} className="animate-spin" color="var(--brand-2)" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = PackageOpen, title, text, action, tone = 'brand' }) {
  return (
    <div className="empty">
      <div className="empty-ico" style={tone === 'brand' ? undefined : { background: 'var(--info-soft)', color: 'var(--info)' }}>
        <Icon size={24} />
      </div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function SectionHead({ icon: Icon, title, sub, action }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-title">
          {Icon && <span className="ico"><Icon size={17} /></span>}
          <span>{title}</span>
        </div>
        {sub && <div className="section-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }) {
  const { label, tone } = statusOf(status);
  return <span className={`status ${tone}`}>{label}</span>;
}

export function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

/* ─────────────────────────────  Copy field  ───────────────────────────── */
export function CopyField({ label, value, hint, onCopied }) {
  const [done, setDone] = React.useState(false);
  const doCopy = async () => {
    const ok = await copyText(value);
    if (ok) {
      setDone(true);
      onCopied?.();
      setTimeout(() => setDone(false), 1800);
    }
  };
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <div className="copy-box">
        <span className="grow truncate">{value || '—'}</span>
        <button type="button" className="btn btn-soft btn-xs" onClick={doCopy} disabled={!value}>
          {done ? <Check size={13} /> : <Copy size={13} />}
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/* ─────────────────────────────  Inline notice  ───────────────────────────── */
export function Notice({ tone = 'info', children }) {
  const map = {
    info: { cls: 'chip-info', Icon: Info },
    ok: { cls: 'chip-ok', Icon: CheckCircle2 },
    warn: { cls: 'chip-warn', Icon: CircleAlert },
    bad: { cls: 'chip-danger', Icon: AlertCircle }
  };
  const { cls, Icon } = map[tone] || map.info;
  return (
    <div className={cls} style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 'var(--r-sm)', alignItems: 'flex-start', fontWeight: 600, lineHeight: 1.5, textTransform: 'none', letterSpacing: 0 }}>
      <Icon size={15} style={{ marginTop: 2, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin" />;
}
