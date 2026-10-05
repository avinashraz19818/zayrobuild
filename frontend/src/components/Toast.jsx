import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3800) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'success' ? 'ok' : t.type === 'error' ? 'err' : ''}`}>
            <span className="toast-ico">
              {t.type === 'success' ? <CheckCircle2 size={18} color="var(--ok)" />
                : t.type === 'error' ? <AlertCircle size={18} color="var(--danger)" />
                  : <Info size={18} color="var(--info)" />}
            </span>
            <span>{t.message}</span>
            <button className="icon-btn" style={{ width: 26, height: 26, background: 'transparent', boxShadow: 'none' }} onClick={() => removeToast(t.id)}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
