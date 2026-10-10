import {ShieldCheck, Zap} from './AnimatedIcon';
import React from 'react';
import {Send, UserCircle2} from 'lucide-react';
import { openTelegramLink } from '../lib/api';

/**
 * Telegram-only gate.
 *
 * Is panel me koi register/login nahi hai — account Telegram bot ke /start se
 * banta hai (Telegram profile hi account hai). Jab panel browser me khule
 * (Telegram ke bahar), tab yahi card dikhta hai jo bot me le jaata hai.
 */
export default function TelegramGate({ botLink, compact = false }) {
  const link = botLink || '';
  return (
    <div className="tg-gate rise-in">
      <div className="tg-gate-ico">
        <Send size={26} />
      </div>
      <h3>Open in Telegram</h3>
      <p>
        Is panel me signup / login nahi hota — aapka <b>Telegram account hi account hai</b>.
        Bot me <code>/start</code> karte hi profile + wallet apne aap ban jaata hai.
      </p>
      <div className="tg-gate-points">
        <span><UserCircle2 size={14} /> Profile Telegram se auto</span>
        <span><Zap size={14} /> Build queue turant</span>
        <span><ShieldCheck size={14} /> No password, no OTP</span>
      </div>
      {link ? (
        <button className="btn btn-gold btn-block btn-lg" onClick={() => openTelegramLink(link)}>
          <Send size={16} />
          Open Telegram bot
        </button>
      ) : (
        <div className="trust-strip" style={{ width: '100%' }}>
          <ShieldCheck size={14} color="var(--warn)" />
          <span>Bot link abhi set nahi hai — admin settings me bot username add karein.</span>
        </div>
      )}
      {!compact && <div className="tg-gate-note">Panel ko hamesha Telegram ke andar se hi kholein.</div>}
    </div>
  );
}
