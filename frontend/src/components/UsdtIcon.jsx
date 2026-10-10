import React from 'react';

/** Local vector Tether mark; no remote image request or icon-font dependency. */
export default function UsdtIcon({ network, size = 32 }) {
  return (
    <span className="usdt-token" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size} height={size} focusable="false">
        <circle cx="20" cy="20" r="19" fill="#26a17b" />
        <circle cx="20" cy="20" r="18" fill="none" stroke="#ffffff30" />
        <path fill="#fff" d="M10 10h20v5H22.6v17h-5.2V15H10z" />
        <ellipse cx="20" cy="20" rx="13" ry="4" fill="#fff" />
        <ellipse cx="20" cy="19.4" rx="11.3" ry="2.4" fill="#26a17b" />
        <path fill="#fff" d="M17.4 15h5.2v6h-5.2z" />
      </svg>
      {network && <span className={`usdt-network usdt-network-${network}`}>
        {network === 'trc20'
          ? <svg viewBox="0 0 16 16"><path d="m3 2 10 3-5 9L3 2Zm0 0 6 5 4-2M9 7l-1 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
          : <svg viewBox="0 0 16 16" fill="currentColor"><path d="m8 1 2.5 2.5L8 6 5.5 3.5ZM3.5 5.5 6 8l-2.5 2.5L1 8ZM12.5 5.5 15 8l-2.5 2.5L10 8ZM8 10l2.5 2.5L8 15l-2.5-2.5ZM8 6l2 2-2 2-2-2Z" /></svg>}
      </span>}
    </span>
  );
}
