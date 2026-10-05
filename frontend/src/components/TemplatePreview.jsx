import React, { useEffect, useState } from 'react';
import { Play, Image as ImageIcon, Sparkles, Layers, ArrowLeft, ArrowRight } from 'lucide-react';
import { Sheet } from './ui';
import { getMediaUrl } from '../utils/media';

export default function TemplatePreview({ design, isOpen, onClose, onBuild }) {
  const [tab, setTab] = useState('images');
  const [idx, setIdx] = useState(0);

  const images = React.useMemo(() => {
    if (!design) return [];
    const list = [];
    if (design.preview_image) list.push(design.preview_image);
    (design.preview_images || []).forEach((img) => { if (img && !list.includes(img)) list.push(img); });
    return list;
  }, [design]);

  useEffect(() => { setTab(design?.preview_video ? 'video' : 'images'); setIdx(0); }, [design]);

  if (!isOpen || !design) return null;

  const hasVideo = Boolean(design.preview_video);

  return (
    <Sheet open={isOpen} onClose={onClose} icon={Layers} title={design.name} subtitle="Template preview — build se pehle dekh lein" wide>
      {(hasVideo || images.length > 1) && (
        <div className="pill-row">
          {hasVideo && (
            <button className={`pill ${tab === 'video' ? 'active' : ''}`} onClick={() => setTab('video')}>
              <Play size={12} /> Video
            </button>
          )}
          {images.length > 0 && (
            <button className={`pill ${tab === 'images' ? 'active' : ''}`} onClick={() => setTab('images')}>
              <ImageIcon size={12} /> Images ({images.length})
            </button>
          )}
        </div>
      )}

      <div style={{ borderRadius: 'var(--r)', overflow: 'hidden', background: 'rgba(0,0,0,.4)', border: '1px solid var(--line)' }}>
        {tab === 'video' && hasVideo ? (
          <video src={getMediaUrl(design.preview_video)} controls autoPlay playsInline style={{ width: '100%', maxHeight: 380, background: '#000' }} />
        ) : images.length > 0 ? (
          <img src={getMediaUrl(images[idx])} alt={design.name} style={{ width: '100%', maxHeight: 420, objectFit: 'contain', background: '#06080f' }} />
        ) : (
          <div className="center-pad" style={{ padding: 60 }}>
            <Layers size={34} opacity={0.4} />
            <span>Is template ke liye preview available nahi hai</span>
          </div>
        )}
      </div>

      {tab === 'images' && images.length > 1 && (
        <div className="flex-row between">
          <button className="btn btn-soft btn-xs" onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}>
            <ArrowLeft size={12} /> Prev
          </button>
          <span className="dim" style={{ fontSize: 12 }}>{idx + 1} / {images.length}</span>
          <button className="btn btn-soft btn-xs" onClick={() => setIdx((i) => (i + 1) % images.length)}>
            Next <ArrowRight size={12} />
          </button>
        </div>
      )}

      {design.description && <p className="dim" style={{ fontSize: 13, lineHeight: 1.6 }}>{design.description}</p>}

      <div className="flex-row between card card-pad">
        <div>
          <div className="label">Build price</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--gold)', marginTop: 4 }}>
            {design.price_coins} coins
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { onClose?.(); onBuild?.(design); }}>
          <Sparkles size={15} /> Build this APK
        </button>
      </div>
    </Sheet>
  );
}
