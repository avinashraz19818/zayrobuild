import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, Box, Wallet, Shield, User, LogIn } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const { user, openAuth } = useAuth();
  const isAdmin = user && (user.isAdmin || user.role === 'admin' || user.username === 'shruti');

  const navItems = [
    { key: 'catalog', label: 'Templates', icon: Layers },
    { key: 'orders', label: 'My Builds', icon: Box },
    { key: 'wallet', label: 'Wallet', icon: Wallet },
    ...(isAdmin ? [{ key: 'admin', label: 'Admin', icon: Shield }] : [])
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(8, 10, 16, 0.94)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(225, 29, 72, 0.12)',
        padding: '6px 8px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 4
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px',
              borderRadius: 12,
              background: isActive
                ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.22) 0%, rgba(159, 18, 57, 0.15) 100%)'
                : 'transparent',
              border: isActive ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid transparent',
              color: isActive ? '#fff' : 'var(--dim)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 2,
                  width: 14,
                  height: 3,
                  borderRadius: 2,
                  background: 'var(--ruby)',
                  boxShadow: '0 0 8px var(--ruby)'
                }}
              />
            )}
            <div style={{ marginTop: isActive ? 2 : 0, color: isActive ? 'var(--ruby-light)' : 'inherit' }}>
              <Icon size={20} />
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
                marginTop: 3,
                letterSpacing: '0.02em',
                color: isActive ? '#fff' : 'var(--muted)'
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Profile / Auth Tab on Mobile */}
      <button
        onClick={() => {
          if (!user) {
            openAuth('login');
          } else {
            setActiveTab('wallet');
          }
        }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 4px',
          borderRadius: 12,
          background: 'transparent',
          border: '1px solid transparent',
          color: user ? 'var(--gold)' : 'var(--dim)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        {user ? (
          <>
            <User size={20} color="var(--gold)" />
            <span style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: 'var(--gold)' }}>
              {user.coins ?? 0}🪙
            </span>
          </>
        ) : (
          <>
            <LogIn size={20} />
            <span style={{ fontSize: 10, fontWeight: 500, marginTop: 3, color: 'var(--muted)' }}>
              Login
            </span>
          </>
        )}
      </button>
    </nav>
  );
}
