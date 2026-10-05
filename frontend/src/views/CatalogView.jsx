import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Search, Layers, Play, Zap, Shield, CheckCircle } from 'lucide-react';

export default function CatalogView({ onSelectDesign, onPreviewDesign }) {
  const { openAuth, user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/designs');
      if (res.ok) {
        const data = await res.json();
        setDesigns(data.designs || data || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const filteredDesigns = designs.filter(d => {
    const matchesCategory = category === 'all' || (d.category || 'zayro').toLowerCase() === category.toLowerCase();
    const matchesSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { key: 'all', label: 'All Templates' },
    { key: 'zayro', label: 'Zayro Core' },
    { key: 'dhani', label: 'Dhani Win' },
    { key: 'premium', label: 'High Roller / VIP' }
  ];

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero Banner */}
      <div className="glass-panel" style={{
        padding: '36px 32px',
        marginBottom: 36,
        background: 'linear-gradient(135deg, rgba(25, 18, 55, 0.85) 0%, rgba(13, 10, 32, 0.95) 100%)',
        border: '1px solid rgba(139, 124, 255, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 750 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            borderRadius: 20,
            background: 'rgba(77, 245, 180, 0.12)',
            border: '1px solid rgba(77, 245, 180, 0.3)',
            color: 'var(--ok)',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 16
          }}>
            <Zap size={14} />
            <span>FLUTTER ENGINE 2.0 ACTIVATED</span>
          </div>
          <h1 style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: 14,
            background: 'linear-gradient(135deg, #ffffff 40%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Build Signed, High-Converting Prediction Apps in Minutes
          </h1>
          <p style={{ fontSize: 15, color: 'var(--dim)', lineHeight: 1.6, marginBottom: 20 }}>
            Powered by high-performance Flutter native architecture. Features include automated audio gating, instant Text-to-Speech, live domain watchdogs, and AES-256 asset encryption.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e0dbff' }}>
              <CheckCircle size={15} color="var(--ok)" /> 60 FPS Smooth WebViews
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e0dbff' }}>
              <CheckCircle size={15} color="var(--ok)" /> Obfuscated Native Code
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e0dbff' }}>
              <CheckCircle size={15} color="var(--ok)" /> Dynamic Firebase Link Updating
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 28
      }}>
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: category === c.key ? '1px solid var(--violet)' : '1px solid var(--border)',
                background: category === c.key ? 'rgba(139, 124, 255, 0.22)' : 'rgba(255,255,255,0.03)',
                color: category === c.key ? '#fff' : 'var(--dim)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} color="var(--dim)" style={{ position: 'absolute', left: 14, top: 12 }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: 40, height: 40 }}
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Designs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)' }}>
          Loading available app designs...
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dim)' }}>
          No designs found matching your filter.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24
        }}>
          {filteredDesigns.map(design => (
            <div key={design.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Preview Thumbnail */}
              <div style={{
                height: 180,
                background: 'rgba(0,0,0,0.6)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {design.preview_image ? (
                  <img
                    src={`/uploads/${design.preview_image}`}
                    alt={design.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Layers size={48} color="rgba(139, 124, 255, 0.3)" />
                )}

                {/* Badge Category */}
                <span style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'rgba(6, 5, 13, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--cyan)'
                }}>
                  {design.category?.toUpperCase() || 'CORE'}
                </span>

                {/* Price Badge */}
                <span style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'rgba(255, 203, 92, 0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 203, 92, 0.4)',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--gold)'
                }}>
                  {design.price_coins || 10} Coins
                </span>
              </div>

              {/* Card Body */}
              <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    {design.name}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5, marginBottom: 16 }}>
                    {design.description || 'Full prediction app with animated radar, live result verification, and instant voice announcement.'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 'auto' }}>
                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px' }}
                    onClick={() => {
                      if (!user) {
                        openAuth('login');
                      } else {
                        onSelectDesign(design);
                      }
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Build This APK</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
