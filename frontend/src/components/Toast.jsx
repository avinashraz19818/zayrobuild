import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxWidth: 360
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 12,
              background: t.type === 'error' ? 'rgba(40, 10, 20, 0.95)' : t.type === 'success' ? 'rgba(10, 35, 25, 0.95)' : 'rgba(20, 16, 44, 0.95)',
              border: `1px solid ${t.type === 'error' ? 'rgba(255, 84, 112, 0.4)' : t.type === 'success' ? 'rgba(77, 245, 180, 0.4)' : 'rgba(139, 124, 255, 0.4)'}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              fontSize: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {t.type === 'error' && <AlertCircle size={18} color="#ff5470" />}
              {t.type === 'success' && <CheckCircle2 size={18} color="#4df5b4" />}
              {t.type === 'info' && <Info size={18} color="#6ec3ff" />}
              <span>{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
