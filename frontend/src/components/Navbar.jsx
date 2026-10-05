import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Coins, Layers, Box, Wallet, Shield, User, LogOut, LogIn, Plus } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, openAuth, logout } = useAuth();

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(6, 5, 13, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: 1300,
        margin: '0 auto',
        height: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand / Logo */}
        <div
          onClick={() => setActiveTab('catalog')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer'
          }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)'
          }}>
            <Box size={22} color="#fff" />
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '0.05em',
              background: 'linear-gradient(135deg, #fff 30%, #8b7bff 70%, #6ec3ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              ZAYRO BUILDER
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '0.1em' }}>
              FLUTTER APK ENGINE 2.0
            </div>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('catalog')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: activeTab === 'catalog' ? 'rgba(139, 124, 255, 0.16)' : 'transparent',
              color: activeTab === 'catalog' ? '#fff' : 'var(--dim)',
              border: activeTab === 'catalog' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            <Layers size={16} />
            <span>Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: activeTab === 'orders' ? 'rgba(139, 124, 255, 0.16)' : 'transparent',
              color: activeTab === 'orders' ? '#fff' : 'var(--dim)',
              border: activeTab === 'orders' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            <Box size={16} />
            <span>My Builds</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: activeTab === 'wallet' ? 'rgba(139, 124, 255, 0.16)' : 'transparent',
              color: activeTab === 'wallet' ? '#fff' : 'var(--dim)',
              border: activeTab === 'wallet' ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            <Wallet size={16} />
            <span>Wallet</span>
          </button>

          {user && (user.isAdmin || user.role === 'admin' || user.username === 'shruti') && (
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 10,
                background: activeTab === 'admin' ? 'rgba(255, 84, 112, 0.2)' : 'transparent',
                color: activeTab === 'admin' ? '#ff5470' : 'var(--dim)',
                border: activeTab === 'admin' ? '1px solid rgba(255, 84, 112, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s'
              }}
            >
              <Shield size={16} />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Right Actions: Coins + User Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user ? (
            <>
              {/* Coin Balance Chip */}
              <div
                onClick={() => setActiveTab('wallet')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 20,
                  background: 'rgba(255, 203, 92, 0.12)',
                  border: '1px solid rgba(255, 203, 92, 0.3)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000'
                }}>
                  <Coins size={14} />
                </div>
                <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: 14 }}>
                  {user.coins ?? 0} Coins
                </span>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(255, 203, 92, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={12} color="var(--gold)" />
                </div>
              </div>

              {/* User Dropdown / Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: 14
                }}>
                  <User size={15} color="var(--violet)" />
                  <span style={{ fontWeight: 600 }}>{user.username}</span>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  style={{
                    background: 'rgba(255, 84, 112, 0.12)',
                    border: '1px solid rgba(255, 84, 112, 0.25)',
                    borderRadius: 10,
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--danger)'
                  }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => openAuth('login')}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: 14 }}
            >
              <LogIn size={15} />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
