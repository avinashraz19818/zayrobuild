import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, tg, tgUser, startParam, initTelegram } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [autoError, setAutoError] = useState(null);

  const applyMe = useCallback((data) => {
    if (!data) { setUser(null); setIsAdmin(false); return; }
    if (data.isAdmin) { setUser({ username: data.username || 'admin', coins: 0 }); setIsAdmin(true); return; }
    setUser(data.user || data);
    setIsAdmin(Boolean(data.isAdmin));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await auth.me();
      applyMe(data);
    } catch (_) {
      applyMe(null);
    }
  }, [applyMe]);

  // Panel Telegram Mini App ke andar khulta hai — initData se seedha login.
  useEffect(() => {
    let alive = true;
    let generation = 0;
    const boot = async () => {
      const current = ++generation;
      const valid = () => alive && current === generation;
      initTelegram();
      try {
        if (window.__verifiedMiniAppLaunch) {
          const data=await auth.me();
          if(valid()){applyMe(data);setAutoError(null);}
          return;
        }
        if (tg?.initData) {
          try {
            const data = await auth.telegram(tg.initData, startParam());
            const currentUser = await auth.me();
            if (valid()) { applyMe(currentUser); setAutoError(null); }
            return;
          } catch (err) { if (valid()) setAutoError(err.message || 'Telegram login failed'); }
        }
        const data = await auth.me();
        if (valid()) applyMe(data);
      } catch (_) { if (valid()) applyMe(null); }
      finally { if (valid()) setLoading(false); }
    };
    void boot();
    const sdkReady = () => { if (tg?.initData) void boot(); };
    window.addEventListener('telegram-sdk-ready', sdkReady);
    return () => { alive = false; window.removeEventListener('telegram-sdk-ready', sdkReady); };
  }, [applyMe]);

  // /api/login sirf success flag deta hai — user object /api/me se aata hai.
  const login = useCallback(async (username, password) => {
    const data = await auth.login(username, password);
    if (data?.isAdmin) {
      setUser({ username: data.username || 'admin', coins: 0 });
      setIsAdmin(true);
    } else {
      await refreshUser();
    }
    setAuthModalOpen(false);
    return data;
  }, [refreshUser]);

  // Register ke baad seedha session bana lo (warna user ko dobara login karna padta).
  const register = useCallback(async (username, email, password) => {
    await auth.register(username, email, password, startParam());
    try {
      await login(username, password);
    } catch (_) {
      setAuthModalOpen(true);
      setAuthMode('login');
    }
    return { success: true };
  }, [login]);

  const logout = useCallback(async () => {
    try { await auth.logout(); } catch (_) { /* ignore */ }
    setUser(null);
    setIsAdmin(false);
  }, []);

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode === 'register' ? 'register' : 'login');
    setAuthModalOpen(true);
  }, []);

  const value = {
    user,
    isAdmin,
    loading,
    autoError,
    login,
    register,
    logout,
    refreshUser,
    authModalOpen,
    setAuthModalOpen,
    authMode,
    setAuthMode,
    openAuth,
    telegramUser: tgUser()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
