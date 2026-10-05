import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function LogsModal({ orderId, isOpen, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  const fetchStatus = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || data);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [order?.build_log]);

  if (!isOpen) return null;

  const isReady = order?.status === 'ready';
  const isFailed = order?.status === 'failed';
  const isBuilding = order?.status === 'building' || order?.status === 'pending';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 720,
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 16,
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(139, 124, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--violet)'
            }}>
              <Terminal size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                Build Console: {order?.app_name || `Build #${orderId}`}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 2 }}>
                <span style={{ color: 'var(--dim)' }}>Status:</span>
                {isBuilding && (
                  <span style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} className="animate-spin" /> Compiling...
                  </span>
                )}
                {isReady && (
                  <span style={{ color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> Complete & Signed
                  </span>
                )}
                {isFailed && (
                  <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={13} /> Build Failed
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={fetchStatus}
              disabled={loading}
              title="Refresh Logs"
              style={{
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
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              style={{
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
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Terminal output */}
        <div
          ref={logRef}
          style={{
            flex: 1,
            marginTop: 16,
            background: 'rgba(4, 3, 10, 0.95)',
            border: '1px solid rgba(139, 124, 255, 0.15)',
            borderRadius: 12,
            padding: 16,
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            lineHeight: 1.6,
            color: '#b3b0d6',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        >
          {order?.build_log ? (
            order.build_log
          ) : (
            <div style={{ color: 'var(--dim)', fontStyle: 'italic' }}>
              Waiting for build worker output...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
