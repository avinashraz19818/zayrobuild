import React from 'react';
import {useAuth} from '../context/AuthContext';
import {resellerPrice,resellerPercent} from '../lib/reseller-pricing';
import {Play, Flame, Wrench, Clock} from 'lucide-react';
import {Sparkles, Layers} from './AnimatedIcon';
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
  const {user}=useAuth();
  const partnerPercent=resellerPercent(user,'apk');
  const discount = partnerPercent || discountOf(design);
  const price = resellerPrice(priceOf(design),user,'apk');
  const original = partnerPercent?priceOf(design):Number(design.original_price_coins || 0);
  const builds = Number(design.orders_count || 0);
  // Maintenance me template store par dikhta hai, par naya build block rehta hai.
  const maint = Number(design.maintenance || 0) === 1;

  return (
    <article
      className={`tpl-card rise-in${maint ? ' is-maint-card' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      onClick={() => { if (!maint) onOpen?.(design); }}
      onKeyDown={(e) => { if(e.target===e.currentTarget&&['Enter',' '].includes(e.key)&&!maint){e.preventDefault();onOpen?.(design);} }}
      role="button"
      tabIndex={0}
    >
      <div className="tpl-media">
        {design.preview_image ? (
          <img
            src={getMediaUrl(design.preview_image)}
            alt={design.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="placeholder"><Layers size={38} /></div>
        )}

        {discount>0&&<span className="savings-ribbon"><span>{discount}% {partnerPercent?'PARTNER':'OFF'}</span></span>}
        <div className="tpl-badges">
          {builds >= 10 && (
            <span className="chip chip-gold" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800 }}>
              <Sparkles size={10} /> Popular
            </span>
          )}
        </div>

        <span className="tpl-shine" aria-hidden="true" />

        {/* Maintenance overlay — store par saaf dikhna chahiye ki ye abhi band hai */}
        {maint && (
          <div className="tpl-maint-veil" aria-hidden="true">
            <span className="tpl-maint-badge">
              <span className="tpl-maint-ico"><Wrench size={17} /></span>
              <b>UNDER<br />MAINTENANCE</b>
            </span>
          </div>
        )}

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

            {discount > 0 && <s>₹{original}</s>}
          </div>
        </div>

        <button
          type="button"
          className={`btn btn-block tpl-build${maint ? ' is-maint' : ' btn-primary'}`}
          disabled={maint}
          onClick={(e) => { e.stopPropagation(); if (!maint) onOpen?.(design); }}
        >
          {maint ? <><Clock size={15} /> MAINTENANCE</> : <><Sparkles size={15} /> Create APK</>}
        </button>
      </div>
    </article>
  );
}
