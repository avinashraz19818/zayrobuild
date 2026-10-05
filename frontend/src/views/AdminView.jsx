import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Shield, Users, CheckCircle, XCircle, RefreshCw, Settings, Coins, Box, Check, X } from 'lucide-react';

export default function AdminView() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users' | 'orders' | 'settings'

  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);

  // Coin Adjustment Modal
  const [coinModalUser, setCoinModalUser] = useState(null);
  const [coinAmount, setCoinAmount] = useState(100);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (_) {}
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/coin-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || data || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || data || {});
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'requests') fetchRequests();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab]);

  const handleApproveRequest = async (id) => {
    try {
      const res = await fetch(`/api/admin/coin-requests/${id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to approve request');
      addToast('Coin request approved successfully!', 'success');
      fetchRequests();
      fetchStats();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      const res = await fetch(`/api/admin/coin-requests/${id}/reject`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reject request');
      addToast('Coin request rejected', 'info');
      fetchRequests();
      fetchStats();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAdjustCoins = async (e) => {
    e.preventDefault();
    if (!coinModalUser) return;
    try {
      const res = await fetch(`/api/admin/users/${coinModalUser.id}/coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(coinAmount, 10) })
      });
      if (!res.ok) throw new Error('Failed to adjust coins');
      addToast(`Adjusted ${coinAmount} coins for ${coinModalUser.username}`, 'success');
      setCoinModalUser(null);
      fetchUsers();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleRebuildOrder = async (id) => {
    try {
      const res = await fetch(`/api/admin/orders/${id}/rebuild`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to trigger rebuild');
      addToast('Build queue triggered with Flutter Engine!', 'success');
      fetchOrders();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      addToast('System settings saved successfully!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
      {/* Admin Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(255, 84, 112, 0.15)',
            border: '1px solid rgba(255, 84, 112, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger)'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
              Admin Control Center
            </h2>
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>
              Manage users, approve payments, and control build queues
            </p>
          </div>
        </div>

        {/* Tab selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(10, 8, 24, 0.8)',
          padding: 4,
          borderRadius: 12,
          border: '1px solid var(--border)'
        }}>
          {[
            { key: 'requests', label: 'Payment Queue', icon: Coins },
            { key: 'users', label: 'Users', icon: Users },
            { key: 'orders', label: 'Build Orders', icon: Box },
            { key: 'settings', label: 'Settings', icon: Settings }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === t.key ? 'var(--violet)' : 'transparent',
                  color: activeTab === t.key ? '#fff' : 'var(--dim)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Coin Requests */}
      {activeTab === 'requests' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Pending Coin Top-Up Requests</h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={fetchRequests}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dim)' }}>
              No pending coin requests in queue.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--dim)' }}>
                    <th style={{ padding: '12px 8px' }}>User ID</th>
                    <th style={{ padding: '12px 8px' }}>Coins</th>
                    <th style={{ padding: '12px 8px' }}>Amount (INR)</th>
                    <th style={{ padding: '12px 8px' }}>UTR / Reference</th>
                    <th style={{ padding: '12px 8px' }}>Screenshot</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '14px 8px', color: '#fff', fontWeight: 600 }}>#{r.user_id}</td>
                      <td style={{ padding: '14px 8px', color: 'var(--gold)', fontWeight: 700 }}>+{r.coins_requested}</td>
                      <td style={{ padding: '14px 8px' }}>₹{r.amount_paid}</td>
                      <td style={{ padding: '14px 8px', fontFamily: "'JetBrains Mono', monospace" }}>{r.utr}</td>
                      <td style={{ padding: '14px 8px' }}>
                        {r.screenshot_file ? (
                          <a href={`/uploads/${r.screenshot_file}`} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>
                            View Proof
                          </a>
                        ) : 'None'}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 8,
                          background: r.status === 'approved' ? 'rgba(77,245,180,0.15)' : r.status === 'rejected' ? 'rgba(255,84,112,0.15)' : 'rgba(255,203,92,0.15)',
                          color: r.status === 'approved' ? 'var(--ok)' : r.status === 'rejected' ? 'var(--danger)' : 'var(--gold)',
                          fontWeight: 600
                        }}>
                          {r.status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                        {r.status === 'pending' && (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => handleApproveRequest(r.id)}
                              style={{
                                background: 'rgba(77, 245, 180, 0.2)',
                                border: '1px solid var(--ok)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                color: 'var(--ok)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              <Check size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(r.id)}
                              style={{
                                background: 'rgba(255, 84, 112, 0.2)',
                                border: '1px solid var(--danger)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>User Accounts ({users.length})</h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={fetchUsers}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--dim)' }}>
                  <th style={{ padding: '12px 8px' }}>ID</th>
                  <th style={{ padding: '12px 8px' }}>Username</th>
                  <th style={{ padding: '12px 8px' }}>Email</th>
                  <th style={{ padding: '12px 8px' }}>Coin Balance</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 8px', color: 'var(--dim)' }}>#{u.id}</td>
                    <td style={{ padding: '14px 8px', color: '#fff', fontWeight: 600 }}>{u.username}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--dim)' }}>{u.email}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--gold)', fontWeight: 700 }}>{u.coins} Coins</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setCoinModalUser(u);
                          setCoinAmount(100);
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Adjust Coins
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>All Build Orders ({orders.length})</h3>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={fetchOrders}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--dim)' }}>
                  <th style={{ padding: '12px 8px' }}>ID</th>
                  <th style={{ padding: '12px 8px' }}>App Name</th>
                  <th style={{ padding: '12px 8px' }}>User</th>
                  <th style={{ padding: '12px 8px' }}>Package</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 8px', color: 'var(--dim)' }}>#{o.id}</td>
                    <td style={{ padding: '14px 8px', color: '#fff', fontWeight: 600 }}>{o.app_name}</td>
                    <td style={{ padding: '14px 8px' }}>User #{o.user_id}</td>
                    <td style={{ padding: '14px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{o.package_name}</td>
                    <td style={{ padding: '14px 8px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 8,
                        background: o.status === 'ready' ? 'rgba(77,245,180,0.15)' : 'rgba(255,203,92,0.15)',
                        color: o.status === 'ready' ? 'var(--ok)' : 'var(--gold)',
                        fontWeight: 600
                      }}>
                        {o.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRebuildOrder(o.id)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                      >
                        Rebuild
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: 28, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 18 }}>System Configuration</h3>
          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                UPI ID FOR PAYMENTS
              </label>
              <input
                type="text"
                className="input-field"
                value={settings.upi_id || ''}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                COIN CONVERSION RATE (INR PER COIN)
              </label>
              <input
                type="number"
                className="input-field"
                value={settings.coin_rate || '1'}
                onChange={(e) => setSettings({ ...settings, coin_rate: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                TELEGRAM BOT TOKEN
              </label>
              <input
                type="text"
                className="input-field"
                value={settings.telegram_bot_token || ''}
                onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: 12, marginTop: 8 }}>
              Save System Settings
            </button>
          </form>
        </div>
      )}

      {/* Coin Adjustment Modal */}
      {coinModalUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              Adjust Coins: {coinModalUser.username}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>
              Current balance: {coinModalUser.coins} Coins. Enter positive amount to add, negative to deduct.
            </p>
            <form onSubmit={handleAdjustCoins} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="number"
                className="input-field"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => setCoinModalUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-gold">
                  Update Coins
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
