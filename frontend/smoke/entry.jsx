/**
 * Smoke entry — panel ko jsdom ke andar mount karta hai (fake API responses ke saath).
 * Vite se build hota hai: npx vite build --ssr smoke/entry.jsx --outDir smoke/dist
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx';

export function mount(rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
  return root;
}
