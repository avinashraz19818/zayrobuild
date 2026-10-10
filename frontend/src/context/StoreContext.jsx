import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { store, orders as ordersApi, wallet } from '../lib/api';
import { useAuth } from './AuthContext';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [designs, setDesigns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [config, setConfig] = useState({ referral_bonus: 10, coin_rate: 1 });
  const [payment, setPayment] = useState({ upi_id: '', upi_qr_image: '', coin_rate: '1' });
  const [referral, setReferral] = useState(null);
  const [fakeSites, setFakeSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const refreshDesigns = useCallback(async () => {
    try {
      const data = await store.designs();
      setDesigns(Array.isArray(data) ? data : (data?.designs || []));
    } catch (_) { /* silent */ }
  }, []);

  const refreshAnnouncement = useCallback(async () => {
    try { setAnnouncement(await store.announcement()); } catch (_) { /* silent */ }
  }, []);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await store.publicConfig();
      if (cfg) setConfig((prev) => ({ ...prev, ...cfg }));
    } catch (_) { /* silent */ }
  }, []);

  const refreshPayment = useCallback(async () => {
    try {
      const p = await store.payment();
      if (p) setPayment((prev) => ({ ...prev, ...p }));
    } catch (_) { /* silent */ }
  }, []);

  const refreshOrders = useCallback(async () => {
    if (!user) { setOrders([]); return; }
    try {
      const data = await ordersApi.list();
      setOrders(Array.isArray(data) ? data : (data?.orders || []));
    } catch (_) { /* silent */ }
  }, [user]);

  const refreshReferral = useCallback(async () => {
    if (!user) { setReferral(null); return; }
    try { setReferral(await wallet.referral()); } catch (_) { /* silent */ }
  }, [user]);

  const refreshFakeSites = useCallback(async () => {
    if (!user) { setFakeSites([]); return; }
    try {
      const data = await ordersApi.fakeSites();
      setFakeSites(Array.isArray(data) ? data : (data?.sites || []));
    } catch (_) { /* silent */ }
  }, [user]);

  useEffect(() => {
    (async () => {
      await Promise.all([refreshDesigns(), refreshAnnouncement(), refreshConfig(), refreshPayment()]);
      setLoading(false);
    })();
  }, [refreshDesigns, refreshAnnouncement, refreshConfig, refreshPayment]);

  // User ke saath order/referral/fake-site data load + halka polling (build status live rahe).
  useEffect(() => {
    if (!user) { setOrders([]); setReferral(null); setFakeSites([]); return undefined; }
    refreshOrders(); refreshReferral(); refreshFakeSites();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      const building = orders.some((o) => o.status === 'pending' || o.status === 'building');
      if (building || document.visibilityState === 'visible') refreshOrders();
    }, 12000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshOrders, refreshReferral, refreshFakeSites]);

  const value = {
    designs,
    orders,
    announcement,
    config,
    payment,
    referral,
    fakeSites,
    loading,
    refreshDesigns,
    refreshAnnouncement,
    refreshConfig,
    refreshPayment,
    refreshOrders,
    refreshReferral,
    refreshFakeSites
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => useContext(StoreContext);
