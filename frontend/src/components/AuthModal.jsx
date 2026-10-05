import React, { useState } from 'react';
import { LogIn, UserPlus, ShieldCheck, Send, Lock, Mail, User, Boxes } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { Sheet, Notice } from './ui';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, authMode, setAuthMode, login, register, telegramUser } = useAuth();
  const { addToast } = useToast();
  const isRegister = authMode === 'register';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authModalOpen) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isRegister) {
        if (!username.trim() || !email.trim() || !password) throw new Error('Saare fields bharna zaroori hai');
        await register(username.trim(), email.trim(), password);
        addToast('Account ban gaya — welcome!', 'success');
      } else {
        if (!username.trim() || !password) throw new Error('Username aur password daalein');
        await login(username.trim(), password);
        addToast('Login successful', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      icon={isRegister ? UserPlus : LogIn}
      title={isRegister ? 'Create account' : 'Sign in'}
      subtitle={isRegister ? 'Coins add karke templates unlock karein' : 'Panel me aapka data safe rehta hai'}
    >
      {telegramUser && (
        <Notice tone="ok">
          Telegram se open kiya hai — auto-login active hai. Ye form sirf tab chahiye jab
          browser me alag se login karna ho.
        </Notice>
      )}

      <form className="stack gap-12" onSubmit={submit}>
        <div className="field">
          <span className="label">Username</span>
          <div className="search-wrap">
            <User size={15} className="ico" />
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoComplete="username" />
          </div>
        </div>

        {isRegister && (
          <div className="field">
            <span className="label">Email</span>
            <div className="search-wrap">
              <Mail size={15} className="ico" />
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
            </div>
          </div>
        )}

        <div className="field">
          <span className="label">Password</span>
          <div className="search-wrap">
            <Lock size={15} className="ico" />
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} />
          </div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div className="flex-row between wrap gap-10">
        <button className="btn btn-ghost btn-sm" onClick={() => setAuthMode(isRegister ? 'login' : 'register')}>
          {isRegister ? 'Already have an account?' : 'New here? Create account'}
        </button>
        <span className="chip chip-ok"><ShieldCheck size={11} /> Encrypted session</span>
      </div>

      <div className="trust-strip" style={{ background: 'rgba(56,189,248,.08)', boxShadow: 'inset 0 0 0 1px rgba(56,189,248,.2)' }}>
        <Send size={14} color="var(--info)" />
        <span>Telegram Mini App me panel auto-login hota hai — <b>koi password yaad rakhne ki zaroorat nahi</b>.</span>
      </div>

      <div className="flex-row gap-8" style={{ justifyContent: 'center' }}>
        <Boxes size={13} color="var(--muted)" />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>ZAYRO BUILD · secure authentication</span>
      </div>
    </Sheet>
  );
}
