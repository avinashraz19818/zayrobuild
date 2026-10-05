import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Box, Download, Terminal, Radio, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function OrdersView({ onOpenLogs, onOpenLiveLinks, onViewCatalog }) {
  const { user, openAuth } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || data || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 4000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div style={{ maxWidth: 800, margin: '80px auto', textAlign: 'center', padding: 24 }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: 'rgba(139, 124, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--violet)'
        }}>
          <Box size={28} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          Sign In to Access Your Builds
        </h2>
        <p style={{ color: 'var(--dim)', marginBottom: 24 }}>
          Log in with your account to view generated Flutter APKs, monitor live build logs, and manage dynamic link redirection.
        </p>
        <button className="btn-primary" onClick={() => openAuth('login')}>
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
            My Generated Builds
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dim)', marginTop: 4 }}>
            Manage and download your signed Flutter APK binaries
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)' }}>
          Loading your build records...
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <Box size={40} color="var(--dim)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            No Builds Generated Yet
          </h3>
          <p style={{ fontSize: 14, color: 'var(--dim)', maxWidth: 450, margin: '0 auto 20px' }}>
            Choose a design template from our catalog and compile your first customized Flutter app.
          </p>
          <button className="btn-primary" onClick={onViewCatalog}>
            Browse Templates
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map(order => {
            const isReady = order.status === 'ready';
            const isBuilding = order.status === 'building' || order.status === 'pending';
            const isFailed = order.status === 'failed';

            return (
              <div key={order.id} className="glass-panel" style={{ padding: 22 }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}>
                  {/* Left: App Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 50,
                      height: 50,
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {order.icon_file ? (
                        <img src={`/uploads/${order.icon_file}`} alt="App Icon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Box size={24} color="var(--violet)" />
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>
                          {order.app_name}
                        </h3>
                        {/* Status Badge */}
                        {isReady && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: 'rgba(77, 245, 180, 0.15)',
                            color: 'var(--ok)',
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={12} /> READY
                          </span>
                        )}
                        {isBuilding && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: 'rgba(255, 203, 92, 0.15)',
                            color: 'var(--gold)',
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            <RefreshCw size={12} className="animate-spin" /> COMPILING
                          </span>
                        )}
                        {isFailed && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 12,
                            background: 'rgba(255, 84, 112, 0.15)',
                            color: 'var(--danger)',
                            fontSize: 11,
                            fontWeight: 700
                          }}>
                            <AlertCircle size={12} /> FAILED
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--dim)' }}>
                        <span>Package: <strong style={{ color: '#fff' }}>{order.package_name}</strong></span>
                        <span>•</span>
                        <span>Engine: <strong style={{ color: 'var(--ok)' }}>Flutter</strong></span>
                        <span>•</span>
                        <span>Created: {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    {/* Console Log Button */}
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => onOpenLogs(order.id)}
                    >
                      <Terminal size={14} />
                      <span>Console Logs</span>
                    </button>

                    {/* Live Links Button */}
                    <button
                      className="btn-secondary"
                      style={{ padding: '8px 14px', fontSize: 13 }}
                      onClick={() => onOpenLiveLinks(order)}
                    >
                      <Radio size={14} color="var(--cyan)" />
                      <span>Dynamic Links</span>
                    </button>

                    {/* Download Real APK */}
                    {order.apk_file && (
                      <a
                        href={`/api/orders/${order.id}/download`}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}
                        download
                      >
                        <Download size={14} />
                        <span>Download APK</span>
                      </a>
                    )}

                    {/* Download Fake APK */}
                    {order.fake_apk_file && (
                      <a
                        href={`/api/orders/${order.id}/download-fake`}
                        className="btn-secondary"
                        style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}
                        download
                      >
                        <Download size={14} />
                        <span>Fake APK</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
