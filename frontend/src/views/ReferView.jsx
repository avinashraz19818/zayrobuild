import React, { useState } from 'react';
import { Gift, Copy, Check, Share2, Users, Coins, Sparkles, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useToast } from '../components/Toast';
import { EmptyState, Loader, SectionHead, Stat, Notice } from '../components/ui';
import { copyText, shareLink, fmtDay } from '../lib/api';
import TelegramGate from '../components/TelegramGate';

const STEPS = [
  { t: 'Apna link share karein', d: 'WhatsApp, Telegram ya kisi bhi group me bhejein.' },
  { t: 'Dost bot se join karein', d: 'Link se open karte hi unka account usi id se jud jaata hai.' },
  { t: 'Coins turant milein', d: 'Pehle login par bonus coins aapke wallet me add ho jaate hain.' }
];

export default function ReferView({ setTab }) {
  const { user, openAuth } = useAuth();
  const { referral, config, refreshReferral } = useStore();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return <TelegramGate botLink={config?.bot_link} />;
  }

  const bonus = config?.referral_bonus ?? 10;
  const link = referral?.link || '';

  const copy = async () => {
    const ok = await copyText(link);
    if (ok) { setCopied(true); addToast('Referral link copied', 'success'); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <>
      <SectionHead icon={Gift} title="Refer & Earn" sub={`Har successful referral par ${bonus} coins aapke wallet me`} />

      <section className="hero" style={{ padding: 16 }}>
        <span className="hero-eyebrow"><Sparkles size={13} /> Invite & earn</span>
        <h2 className="hero-title" style={{ fontSize: 22 }}>Dost laao, coins kamao</h2>
        <p className="hero-text">
          Aapka referral link share karein. Jab bhi koi naya user us link se panel me aata hai,
          aapko {bonus} coins milte hain — koi limit nahi.
        </p>

        <div className="stat-grid" style={{ marginTop: 16 }}>
          <Stat value={referral?.invited_count ?? 0} label="Total invited" />
          <Stat value={referral?.earned_coins ?? 0} label="Coins earned" />
          <Stat value={referral?.pending_count ?? 0} label="Pending joins" />
        </div>
      </section>

      <section className="section">
        <SectionHead icon={Send} title="Your referral link" />
        {!referral ? (
          <Loader label="Referral details load ho rahi hain…" />
        ) : (
          <div className="card card-pad stack gap-12">
            <div className="field">
              <span className="label">Invite code</span>
              <div className="copy-box">
                <span className="grow truncate">{referral.code}</span>
                <button className="btn btn-soft btn-xs" onClick={copy}><Copy size={13} /> Copy</button>
              </div>
            </div>

            <div className="field">
              <span className="label">Referral link</span>
              <div className="copy-box">
                <span className="grow truncate">{link || 'Link ban rahi hai…'}</span>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={copy} disabled={!link}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <button
                className="btn btn-soft"
                disabled={!link}
                onClick={() => {
                  shareLink(link, `ZAYRO BUILD join karo — premium APK templates, fast builds.`);
                  addToast('Share sheet khul rahi hai…', 'info');
                }}
              >
                <Share2 size={15} /> Share
              </button>
              <button className="btn btn-ghost" onClick={() => refreshReferral()}><Sparkles size={14} /> Refresh</button>
            </div>

            {!link && (
              <Notice tone="warn">
                Bot username set nahi hai — admin settings me Telegram bot configure karein, tab link generate hoga.
              </Notice>
            )}
          </div>
        )}
      </section>

      <section className="section">
        <SectionHead icon={Users} title="How it works" />
        <div className="stack gap-8">
          {STEPS.map((s, i) => (
            <div key={s.t} className="row-item">
              <span className="row-ico gold" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>{i + 1}</span>
              <span className="row-main">
                <span className="row-title">{s.t}</span>
                <span className="row-sub">{s.d}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHead icon={Coins} title="Recent referrals" sub="Naye users jo aapke link se aaye" />
        {!referral?.recent?.length ? (
          <EmptyState
            icon={Users}
            title="Abhi koi referral nahi"
            text="Link share karna shuru karein — pehla referral aate hi yahan dikhega."
            action={<button className="btn btn-soft btn-sm" onClick={() => setTab?.('home')}>Browse store</button>}
          />
        ) : (
          <div className="stack gap-8">
            {referral.recent.map((r, i) => (
              <div key={`${r.name}-${i}`} className="row-item">
                <span className="row-ico ok"><ShieldCheck size={16} /></span>
                <span className="row-main">
                  <span className="row-title">{r.name}</span>
                  <span className="row-sub">Joined {fmtDay(r.created_at)}</span>
                </span>
                <span className="chip chip-gold">+{r.bonus ?? bonus}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
