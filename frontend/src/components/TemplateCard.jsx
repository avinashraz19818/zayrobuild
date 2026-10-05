import React from 'react';
import { Layers, Play, Sparkles, Flame } from 'lucide-react';
import { getMediaUrl } from '../utils/media';
import { CoinIco } from './AppShell';

export function priceOf(design) {
  return Number(design?.price_coins ?? 0);
}

export function discountOf(design) {
  const price = priceOf(design);
  const original = Number(design?.original_price_coins ?? 0);
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

/**
 * Template card — premium store tile.
 * Category naam (Zayro Core / Dhani Win etc.) jaan-boojh kar nahi dikhaya jaata;
 * sirf discount + builds count, aur niche poora "Create APK" button.
 */
export default function TemplateCard({ design, onOpen, onPreview, index = 0 }) {
  const discount = discountOf(design);
  const price = priceOf(design);
  const original = Number(design.original_price_coins || 0);
  const builds = Number(design.orders_count || 0);

  return (
    <article
      className="tpl-card rise-in"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      onClick={() => onOpen?.(design)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(design); }}
      role="button"
      tabIndex={0}
    >
      <div className="tpl-media">
        {design.preview_image ? (
          <img
            src={getMediaUrl(design.preview_image)}
            alt={design.name}
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="placeholder"><Layers size={38} /></div>
        )}

        <div className="tpl-badges">
          {discount > 0 && (
            <span className="chip chip-danger" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800 }}>
              <Flame size={10} /> {discount}% OFF
            </span>
          )}
          {builds >= 10 && (
            <span className="chip chip-gold" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800 }}>
              <Sparkles size={10} /> Popular
            </span>
          )}
        </div>

        <span className="tpl-shine" aria-hidden="true" />

        {design.preview_video && (
          <button
            type="button"
            className="tpl-play"
            onClick={(e) => { e.stopPropagation(); onPreview?.(design); }}
            title="Preview"
          >
            <Play size={14} />
          </button>
        )}
      </div>

      <div className="tpl-body">
        <h3 className="tpl-name">{design.name}</h3>
        {design.description && <p className="tpl-desc">{design.description}</p>}

        <div className="tpl-foot">
          <div className="tpl-price">
            <CoinIco size={13} />
            <b>{price}</b>
            <span className="muted" style={{ fontSize: 10.5, fontWeight: 700 }}>COINS</span>
            {discount > 0 && <s>{original}</s>}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block tpl-build"
          onClick={(e) => { e.stopPropagation(); onOpen?.(design); }}
        >
          <Sparkles size={15} />
          Create APK
        </button>
      </div>
    </article>
  );
}
