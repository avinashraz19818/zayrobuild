import React, { useEffect, useRef, useState } from 'react';
import { Terminal, RefreshCw, Download, CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { Sheet, StatusPill } from './ui';
import { orders as ordersApi, fmtDate } from '../lib/api';

export default function LogsModal({ orderId, isOpen, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !orderId) return undefined;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await ordersApi.status(orderId);
        if (alive) setOrder(data?.order || data);
      } catch (_) { /* silent */ }
      finally { if (alive) setLoading(false); }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [isOpen, orderId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [order?.build_log]);

  if (!isOpen) return null;

  const building = order && (order.status === 'building' || order.status === 'pending');

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      icon={Terminal}
      title={`Build logs · #${orderId}`}
      subtitle={order ? `Updated ${fmtDate(Date.now())}` : 'Connecting…'}
      wide
    >
      <div className="flex-row between wrap gap-10">
        {order ? <StatusPill status={order.status} /> : <span className="chip"><Loader2 size={12} className="animate-spin" /> Loading</span>}
        <div className="flex-row gap-8">
          <button className="btn btn-soft btn-xs" onClick={() => setLoading(true)} disabled={loading}>
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {order?.apk_file && (
            <a className="btn btn-primary btn-xs" href={`/api/orders/${orderId}/download`} download>
              <Download size={12} /> Download APK
            </a>
          )}
        </div>
      </div>

      <div className="console" ref={logRef}>
        {order?.build_log ? order.build_log : (building ? 'Build queue me hai… logs aate hi yahan dikhenge.' : 'Koi log available nahi.')}
        {building && <span className="cursor" />}
      </div>

      {order?.status === 'done' && (
        <div className="trust-strip">
          <CheckCircle2 size={14} color="var(--ok)" />
          <span>Build complete — <b>APK download</b> button se file le lein.</span>
        </div>
      )}
      {order?.status === 'failed' && (
        <div className="trust-strip" style={{ background: 'var(--danger-soft)', boxShadow: 'inset 0 0 0 1px rgba(251,113,133,.25)' }}>
          <CircleAlert size={14} color="var(--danger)" />
          <span>Build fail hua — coins auto-refund ho jaate hain. Dobara try karein ya support se baat karein.</span>
        </div>
      )}
    </Sheet>
  );
}
