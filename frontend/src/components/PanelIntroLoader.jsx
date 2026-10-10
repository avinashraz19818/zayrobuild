import {ShieldCheck, Zap} from './AnimatedIcon';
import React, { useEffect, useState } from 'react';

import { useStore } from '../context/StoreContext';

export default function PanelIntroLoader({ onComplete }) {
  const { config } = useStore();
  const brandName = String(config?.site_name || 'ZAYRO BUILD').trim() || 'ZAYRO BUILD';
  const brandLogo = config?.logo_url;
  const STEPS = React.useMemo(() => ([
    { at: 12, text: 'Store front load ho raha hai…' },
    { at: 38, text: 'Hacks sync ho rahe hain…' },
    { at: 62, text: 'Wallet & session check…' },
    { at: 86, text: 'Secure build engine ready…' },
    { at: 100, text: `Welcome to ${brandName}` }
  ]), [brandName]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(STEPS[0].text);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(100, current + Math.floor(Math.random() * 9) + 4);
      setProgress(current);
      const step = STEPS.filter((s) => current >= s.at).pop();
      if (step) setStatus(step.text);
      if (current >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setFade(true);
          setTimeout(() => onComplete?.(), 380);
        }, 260);
      }
    }, 70);
    return () => clearInterval(timer);
  }, [onComplete, STEPS]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(900px 520px at 20% 0%, rgba(103,92,236,.32), transparent 60%), linear-gradient(180deg,#0d1024,#090b1c)',
        transition: 'opacity .4s ease, transform .4s ease',
        opacity: fade ? 0 : 1,
        transform: fade ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: fade ? 'none' : 'auto'
      }}
    >
      <div style={{ textAlign: 'center', padding: 24, maxWidth: 380 }}>
        <div className="load-mark float-y">
          {brandLogo
            ? <img src={brandLogo} alt="" />
            : (
              <div className="load-mark-glow" aria-hidden="true" />
            )}
          {!brandLogo && <b>{brandName.charAt(0).toUpperCase()}</b>}
          <span className="load-ring" aria-hidden="true" />
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          {brandName}
        </h1>
        <p style={{ fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 22 }}>
          Premium APK Marketplace
        </p>

        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', border: '1px solid var(--line)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 99,
              background: 'linear-gradient(90deg, var(--brand-3), var(--brand-2), var(--info))',
              boxShadow: '0 0 16px var(--brand-glow)',
              transition: 'width .1s linear'
            }}
          />
        </div>

        <div className="flex-row between" style={{ marginTop: 10, fontSize: 11.5, color: 'var(--dim)' }}>
          <span className="flex-row gap-6"><Zap size={12} color="var(--brand-2)" />{status}</span>
          <b style={{ color: '#fff' }}>{progress}%</b>
        </div>

        <div className="flex-row gap-6" style={{ justifyContent: 'center', marginTop: 18, fontSize: 11, color: 'var(--muted)' }}>
          <ShieldCheck size={12} color="var(--ok)" /> Secure session · AES-256 builds
        </div>
      </div>
    </div>
  );
}
