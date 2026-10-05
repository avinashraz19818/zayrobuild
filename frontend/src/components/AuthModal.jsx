import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { X, Lock, Mail, User, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, authMode, openAuth, login, register } = useAuth();
  const { addToast } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast('Please enter both username and password', 'error');
      return;
    }
    if (authMode === 'register' && !email.trim()) {
      addToast('Please enter your email', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (authMode === 'login') {
        await login(username, password);
        addToast('Logged in successfully!', 'success');
      } else {
        await register(username, email, password);
        addToast('Account created successfully!', 'success');
      }
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
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 420,
        padding: 28,
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
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

        {/* Header Tabs */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(139, 124, 255, 0.15)',
            color: 'var(--violet)',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8
          }}>
            <Sparkles size={12} />
            <span>ZAYRO AUTHENTICATION</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
            {authMode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>
            {authMode === 'login' ? 'Enter credentials to manage your builds' : 'Sign up to build Flutter apps instantly'}
          </p>
        </div>

        {/* Switch tab buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'rgba(10, 8, 24, 0.8)',
          padding: 4,
          borderRadius: 12,
          marginBottom: 20
        }}>
          <button
            type="button"
            onClick={() => openAuth('login')}
            style={{
              padding: '8px',
              borderRadius: 8,
              border: 'none',
              background: authMode === 'login' ? 'var(--violet)' : 'transparent',
              color: authMode === 'login' ? '#fff' : 'var(--dim)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => openAuth('register')}
            style={{
              padding: '8px',
              borderRadius: 8,
              border: 'none',
              background: authMode === 'register' ? 'var(--violet)' : 'transparent',
              color: authMode === 'register' ? '#fff' : 'var(--dim)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
              USERNAME
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--dim)" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          {authMode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--dim)" style={{ position: 'absolute', left: 14, top: 14 }} />
                <input
                  type="email"
                  className="input-field"
                  style={{ paddingLeft: 42 }}
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--dim)" style={{ position: 'absolute', left: 14, top: 14 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 13,
                  background: 'none',
                  border: 'none',
                  color: 'var(--dim)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 8, padding: '12px' }}
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
