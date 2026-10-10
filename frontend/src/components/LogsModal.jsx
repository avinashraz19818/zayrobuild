import {RefreshCw} from './AnimatedIcon';
import React, { useEffect, useRef, useState } from 'react';
import {Terminal, CircleAlert, Loader2} from 'lucide-react';
import { Sheet, StatusPill } from './ui';
import { orders as ordersApi } from '../lib/api';

// Customer-facing status only. Never render internal build output or errors.
export default function LogsModal({ orderId, isOpen, onClose }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen || !orderId) return undefined;
    let alive = true;
    let timer;
    setOrder(null);
    setError(false);
    const load = async () => {
      setLoading(true);
      let terminal = false;
      try {
        const data = await ordersApi.status(orderId);
        const next = data?.order || data;
        if (!next?.status || data?.error) throw new Error('Status unavailable');
        if (!alive) return;
        setOrder(next);
        setError(false);
        terminal = next.status === 'done' || next.status === 'failed';
        if (next.status === 'done') closeRef.current();
      } catch (_) {
        if (alive) setError(true);
      } finally {
        if (alive) {
          setLoading(false);
          if (!terminal) timer = setTimeout(load, 3000);
        }
      }
    };
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [isOpen, orderId, refresh]);

  if (!isOpen) return null;
  const building = order?.status === 'building' || order?.status === 'pending';
  const messages = {
    pending: 'Order received.\nWaiting for an available build slot…',
    building: 'Order received.\nYour APK is being prepared…\nYou can leave this window and check back later.',
    done: 'Your APK is ready to download.',
    failed: 'Build could not be completed.\nPlease contact support with your order number.'
  };

  return (
    <Sheet open={isOpen} onClose={onClose} icon={Terminal}
      title={`Build progress · #${orderId}`} subtitle="Order status" wide>
      <div className="flex-row between wrap gap-10">
        {order ? <StatusPill status={order.status} /> : <span className="chip"><Loader2 size={12} className="animate-spin" /> Connecting</span>}
        <button className="btn btn-soft btn-xs" onClick={() => setRefresh((n) => n + 1)} disabled={loading}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      <div className="console" role="status" aria-live="polite">
        {error ? 'Status temporarily unavailable. Retrying…' : (messages[order?.status] || 'Checking your order…')}
        {building && !error && <span className="cursor" />}
      </div>
      {order?.status === 'failed' && (
        <div className="trust-strip">
          <CircleAlert size={14} color="var(--danger)" />
          <span>Support reference: order #{orderId}</span>
        </div>
      )}
    </Sheet>
  );
}
