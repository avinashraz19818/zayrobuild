import React, { useState, useEffect } from 'react';
import { Shield, Zap, Terminal, Activity, CheckCircle2 } from 'lucide-react';

export default function PanelIntroLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING ZAYRO PROTOCOLS...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const statuses = [
      { at: 15, text: 'BOOTING COMPILER SUBSYSTEMS...' },
      { at: 40, text: 'SYNCHRONIZING CLOUD RTDB NODES...' },
      { at: 65, text: 'CHECKING AES-256 NATIVE SECURITY...' },
      { at: 88, text: 'CALIBRATING APPLICATION TEMPLATES...' },
      { at: 99, text: 'SYSTEM READY // ACCESS GRANTED' }
    ];

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 3;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        setStatusText('SYSTEM READY // ACCESS GRANTED');
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
        }, 300);
      } else {
        setProgress(current);
        const match = statuses.filter(s => current >= s.at).pop();
        if (match) setStatusText(match.text);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#070103',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s ease',
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'all',
        transform: fadeOut ? 'scale(1.03)' : 'scale(1)'
      }}
    >
      {/* Background Animated Cyber Grid */}
      <div className="cyber-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />

      {/* Ambient Red Glow Spotlight */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.22) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
        animation: 'pulse-slow 2.5s ease-in-out infinite'
      }} />

      {/* Center Radar / Reactor Core */}
      <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 32 }}>
        {/* Outer Rotating Ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px dashed rgba(239, 68, 68, 0.4)',
          animation: 'spin 8s linear infinite'
        }} />

        {/* Counter-Rotating Middle Ring */}
        <div style={{
          position: 'absolute',
          inset: 12,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#ef4444',
          borderRightColor: '#ef4444',
          boxShadow: '0 0 25px rgba(239, 68, 68, 0.5)',
          animation: 'spin 3s linear infinite reverse'
        }} />

        {/* Central Core Shield Icon */}
        <div style={{
          position: 'absolute',
          inset: 26,
          borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.35) 0%, rgba(127, 29, 29, 0.5) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.6), inset 0 0 15px rgba(239, 68, 68, 0.3)'
        }}>
          <Shield size={38} color="#ffffff" style={{ filter: 'drop-shadow(0 0 8px #ef4444)' }} />
        </div>
      </div>

      {/* Brand Title */}
      <div style={{ textAlign: 'center', marginBottom: 20, zIndex: 2 }}>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 26,
          fontWeight: 900,
          letterSpacing: '0.18em',
          background: 'linear-gradient(135deg, #ffffff 40%, #fca5a5 70%, #ef4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 6,
          textShadow: '0 0 30px rgba(239, 68, 68, 0.4)'
        }}>
          ZAYRO BUILD
        </h1>
        <p style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.22em',
          color: 'rgba(255, 200, 200, 0.7)',
          textTransform: 'uppercase'
        }}>
          ADVANCED APPLICATION COMPILER
        </p>
      </div>

      {/* Progress Bar Container */}
      <div style={{
        width: 320,
        height: 6,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        position: 'relative',
        marginBottom: 16,
        zIndex: 2,
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #dc2626 0%, #ef4444 70%, #f87171 100%)',
          borderRadius: 4,
          boxShadow: '0 0 15px #ef4444',
          transition: 'width 0.08s ease-out'
        }} />
      </div>

      {/* Percentage & Status Text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 320,
        fontSize: 12,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#f87171',
        zIndex: 2
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
          <Activity size={13} className="animate-spin" />
          <span style={{ letterSpacing: '0.05em' }}>{statusText}</span>
        </span>
        <span style={{ fontWeight: 700, color: '#ffffff', minWidth: 42, textAlign: 'right' }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}
