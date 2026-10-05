import React from 'react';
import { X, Sparkles, Volume2, Shield } from 'lucide-react';
import { getMediaUrl } from '../utils/media';

export default function VideoPreviewModal({ design, isOpen, onClose, onSelectForBuild }) {
  if (!isOpen || !design) return null;

  const videoUrl = design.preview_video ? getMediaUrl(design.preview_video) : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 4, 7, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="luxury-glass"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(165deg, rgba(16, 18, 30, 0.96) 0%, rgba(8, 10, 18, 0.98) 100%)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px rgba(225, 29, 72, 0.2)',
          borderRadius: 20,
          padding: 18,
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: 10,
            width: 32,
            height: 32,
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

        {/* Header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="badge-ruby" style={{ fontSize: 10, padding: '2px 8px' }}>LIVE PREVIEW</span>
            <span className="badge-gold" style={{ fontSize: 10, padding: '2px 8px' }}>🪙 {design.price_coins || 999} Coins</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', paddingRight: 32 }}>
            {design.name}
          </h3>
        </div>

        {/* Video Player */}
        <div
          style={{
            width: '100%',
            height: 320,
            background: '#000',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16
          }}
        >
          {videoUrl ? (
            <video
              src={videoUrl}
              autoPlay
              loop
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ color: 'var(--dim)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Video preview currently unavailable for this template.
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 12 }}
          onClick={() => {
            onClose();
            onSelectForBuild(design);
          }}
        >
          <Sparkles size={16} />
          <span>Build This APK Now</span>
        </button>
      </div>
    </div>
  );
}
