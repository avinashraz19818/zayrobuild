import React, { useState } from 'react';
import { useToast } from './Toast';
import { X, Globe, Radio, Save, AlertCircle } from 'lucide-react';

export default function LiveLinksModal({ order, isOpen, onClose, onUpdated }) {
  const { addToast } = useToast();
  const [newUrl, setNewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      addToast('Please enter the new domain or register URL', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/change-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_domain: newUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update live links');

      addToast('Live link updated! All installed APKs will switch dynamically.', 'success');
      onUpdated();
      onClose();
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
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      padding: 16
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: 480,
        padding: 26,
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
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
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(110, 195, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan)'
          }}>
            <Radio size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Live Dynamic Links
            </h3>
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>
              App: {order.app_name}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(110, 195, 255, 0.08)',
          border: '1px solid rgba(110, 195, 255, 0.2)',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          gap: 10,
          marginBottom: 18
        }}>
          <AlertCircle size={18} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: '#c4e5ff', lineHeight: 1.5 }}>
            <strong>Zero Re-install:</strong> Changing this updates the destination in all previously distributed APKs via Realtime Database!
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 4 }}>CURRENT DOMAIN / URL</div>
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            padding: '10px 12px',
            borderRadius: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: '#fff',
            wordBreak: 'break-all'
          }}>
            {order.domain || order.register_url}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
              NEW REGISTER URL OR DOMAIN
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. newdomain.com or https://newdomain.com/register"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Save size={15} />
              <span>{submitting ? 'Updating...' : 'Update Links Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
