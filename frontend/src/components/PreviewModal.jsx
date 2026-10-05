import React, { useState } from 'react';
import { X, Play, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, Shield, CheckCircle, Volume2 } from 'lucide-react';

export default function PreviewModal({ design, isOpen, onClose, onSelectForBuild }) {
  if (!isOpen || !design) return null;

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const getMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/')) return url;
    return `/uploads/${url}`;
  };

  const images = [];
  if (design.preview_image) images.push(getMediaUrl(design.preview_image));
  if (Array.isArray(design.preview_images)) {
    design.preview_images.forEach(img => {
      const u = getMediaUrl(img);
      if (u && !images.includes(u)) images.push(u);
    });
  }

  const hasVideo = !!design.preview_video;
  const videoUrl = hasVideo ? getMediaUrl(design.preview_video) : '';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(2, 1, 6, 0.88)',
      backdropFilter: 'blur(16px)',
      padding: 20
    }}>
      <div className="luxury-glass" style={{
        width: '100%',
        maxWidth: 960,
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: 30,
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 22,
            right: 22,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{
            padding: '4px 12px',
            borderRadius: 20,
            background: 'rgba(139, 124, 255, 0.15)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            fontSize: 12,
            fontWeight: 800
          }}>
            {design.category?.toUpperCase() || 'PREMIUM'}
          </span>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
            {design.name}
          </h2>
          <span className="badge-gold">
            🪙 {design.price_coins || 10} Coins
          </span>
        </div>

        {/* Media Preview Box */}
        <div style={{
          width: '100%',
          height: 400,
          background: '#000',
          borderRadius: 16,
          border: '1px solid var(--card-border)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {hasVideo && activeMediaIndex === -1 ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : images.length > 0 ? (
            <img
              src={images[activeMediaIndex] || images[0]}
              alt={design.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <ImageIcon size={48} />
              <span>Interactive preview generated upon build</span>
            </div>
          )}

          {/* Navigation Arrows for Images */}
          {images.length > 1 && activeMediaIndex >= 0 && (
            <>
              <button
                onClick={() => setActiveMediaIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.65)',
                  border: '1px solid var(--card-border)',
                  color: '#fff',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setActiveMediaIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.65)',
                  border: '1px solid var(--card-border)',
                  color: '#fff',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Selector Row */}
        {(images.length > 1 || hasVideo) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, overflowX: 'auto', paddingBottom: 6 }}>
            {hasVideo && (
              <button
                onClick={() => setActiveMediaIndex(-1)}
                style={{
                  width: 80,
                  height: 54,
                  borderRadius: 10,
                  border: activeMediaIndex === -1 ? '2px solid var(--cyan)' : '1px solid var(--card-border)',
                  background: 'rgba(6, 182, 212, 0.15)',
                  color: 'var(--cyan)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  gap: 3,
                  flexShrink: 0
                }}
              >
                <Play size={16} />
                <span>VIDEO</span>
              </button>
            )}

            {images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt="Thumbnail"
                onClick={() => setActiveMediaIndex(idx)}
                style={{
                  width: 80,
                  height: 54,
                  objectFit: 'cover',
                  borderRadius: 10,
                  border: activeMediaIndex === idx ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
            ))}
          </div>
        )}

        {/* Description & Technical Highlights */}
        <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              TEMPLATE OVERVIEW
            </h4>
            <p style={{ fontSize: 14, color: '#d5d1f2', lineHeight: 1.6 }}>
              {design.description || 'Full prediction app with animated radar, live result verification, and instant voice announcement.'}
            </p>
          </div>

          <div style={{ background: 'rgba(10, 8, 24, 0.6)', padding: 16, borderRadius: 14, border: '1px solid var(--card-border)' }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={15} /> BUILT-IN NATIVE ENGINE FEATURES
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              <div>✓ 60 FPS Hardware-Accelerated Flutter InAppWebView</div>
              <div>✓ Native Sound Effects + Google TTS Voice Engine</div>
              <div>✓ Anti-Ban / Tamper Protected (AES-256 PKCS7)</div>
              <div>✓ Instant Domain Switch via Realtime Database</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 26, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--card-border)', paddingTop: 18 }}>
          <button className="btn-ghost-glow" onClick={onClose}>
            Close Preview
          </button>
          <button
            className="btn-shimmer"
            onClick={() => {
              onClose();
              onSelectForBuild(design);
            }}
          >
            <Sparkles size={16} />
            <span>Customize & Build This App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
