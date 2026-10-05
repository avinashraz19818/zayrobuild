import React from 'react';
import { Layers, Play, ArrowRight, Sparkles, Flame } from 'lucide-react';
import { getMediaUrl } from '../utils/media';

const CATEGORY_LABEL = { zayro: 'Zayro Core', dhani: 'Dhani Win', premium: 'VIP', normal: 'Standard' };

export function priceOf(design) {
  return Number(design?.price_coins ?? 0);
}

export function discountOf(design) {
  const price = priceOf(design);
  const original = Number(design?.original_price_coins ?? 0);
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

export default function TemplateCard({ design, onOpen, onPreview, index = 0 }) {
  const hasMedia = Boolean(design.preview_image || design.preview_video || (design.preview_images || []).length);
  const discount = discountOf(design);
  const price = priceOf(design);
  const original = Number(design.original_price_coins || 0);

  return (
    <article
      className="tpl-card rise-in"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      onClick={() => onOpen?.(design)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(design); }}
    >
      <div className="tpl-media">
        {design.preview_image ? (
          <img src={getMediaUrl(design.preview_image)} alt={design.name} loading="lazy" />
        ) : (
          <div className="placeholder"><Layers size={38} /></div>
        )}

        <div className="tpl-badges">
          <span className="chip chip-brand" style={{ fontSize: 9.5, padding: '3px 8px' }}>
            {CATEGORY_LABEL[design.category] || 'Template'}
          </span>
          {discount > 0 && (
            <span className="chip chip-danger" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800 }}>
              <Flame size={10} /> {discount}% OFF
            </span>
          )}
        </div>

        {design.preview_video && (
          <button
            type="button"
            className="tpl-cta"
            style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32 }}
            onClick={(e) => { e.stopPropagation(); onPreview?.(design); }}
            title="Preview"
          >
            <Play size={14} />
          </button>
        )}
      </div>

      <div className="tpl-body">
        <div>
          <h3 className="tpl-name">{design.name}</h3>
          {design.description && <p className="tpl-desc">{design.description}</p>}
        </div>

        <div className="tpl-foot">
          <div className="tpl-price">
            <b>{price}</b>
            <span className="muted" style={{ fontSize: 10.5, fontWeight: 700 }}>COINS</span>
            {discount > 0 && <s>{original}</s>}
          </div>
          <button
            type="button"
            className="tpl-cta"
            title="Build this APK"
            onClick={(e) => { e.stopPropagation(); onOpen?.(design); }}
          >
            {hasMedia ? <ArrowRight size={15} /> : <Sparkles size={15} />}
          </button>
        </div>
      </div>
    </article>
  );
}
