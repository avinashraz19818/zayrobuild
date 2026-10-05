import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider, useStore } from './context/StoreContext';
import { ToastProvider, useToast } from './components/Toast';
import { TopBar, BottomNav, Footer, Brand } from './components/AppShell';
import HomeView from './views/HomeView';
import CatalogView from './views/CatalogView';
import OrdersView from './views/OrdersView';
import WalletView from './views/WalletView';
import AccountView from './views/AccountView';
import ReferView from './views/ReferView';
import FakeSiteView from './views/FakeSiteView';
import AdminView from './views/AdminView';
import AuthModal from './components/AuthModal';
import BuildWizardModal from './components/BuildWizardModal';
import TemplatePreview from './components/TemplatePreview';
import LogsModal from './components/LogsModal';
import LiveLinksModal from './components/LiveLinksModal';
import PanelIntroLoader from './components/PanelIntroLoader';

const TAB_KEYS = ['home', 'templates', 'fakesite', 'refer', 'orders', 'account', 'wallet', 'admin'];

function Panel() {
  const { user, isAdmin, loading, openAuth } = useAuth();
  const { orders, config } = useStore();
  const { addToast } = useToast();

  const [tab, setTab] = useState('home');
  const [splashDone, setSplashDone] = useState(false);
  const [buildDesign, setBuildDesign] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null);
  const [logsOrder, setLogsOrder] = useState(null);
  const [linksOrder, setLinksOrder] = useState(null);

  // Server auth redirect errors (?err=...) ko friendly message me badlo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('err');
    if (!err) return;
    const map = {
      invalid_tg_auth: 'Telegram link invalid tha — bot se dobara open karein.',
      tg_link_expired: 'Telegram login link expire ho gaya, dobara try karein.',
      invalid_signature: 'Telegram signature verify nahi hua.',
      auth_unavailable: 'Telegram auth abhi configured nahi hai.'
    };
    addToast(map[err] || 'Login me problem aayi — dobara try karein.', 'error');
    window.history.replaceState({}, '', window.location.pathname);
  }, [addToast]);

  // Document title bhi store ke naam se — skillhub format: "<STORE> · Premium APK Marketplace"
  useEffect(() => {
    const name = String(config?.site_name || '').trim() || 'ZAYRO BUILD';
    document.title = `${name} · Premium APK Marketplace`;
  }, [config?.site_name]);

  // Telegram back button -> pehla tab
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.BackButton) return undefined;
    if (tab !== 'home') {
      tg.BackButton.show();
      const handler = () => setTab('home');
      tg.BackButton.onClick(handler);
      return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
    }
    tg.BackButton.hide();
    return undefined;
  }, [tab]);

  // Telegram me panel khulne par ek baar haptic feedback (premium feel)
  useEffect(() => {
    if (!splashDone) return;
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.('light'); } catch (_) { /* ignore */ }
  }, [tab, splashDone]);

  const queueCount = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'building').length,
    [orders]
  );

  const goTab = (next) => setTab(next);

  const body = (() => {
    if (loading && !splashDone) return null;
    switch (tab) {
      case 'templates':
        return <CatalogView onOpenDesign={setBuildDesign} onPreview={setPreviewDesign} />;
      case 'orders':
        return <OrdersView
          onOpenLogs={(id) => setLogsOrder(id)}
          onOpenLiveLinks={(order) => setLinksOrder(order)}
          setTab={goTab}
        />;
      case 'wallet':
        return <WalletView setTab={goTab} />;
      case 'account':
        return <AccountView setTab={goTab} onAddFund={() => setTab('wallet')} />;
      case 'refer':
        return <ReferView setTab={goTab} />;
      case 'fakesite':
        return <FakeSiteView setTab={goTab} onOpenDesign={setBuildDesign} />;
      case 'admin':
        return <AdminView />;
      case 'home':
      default:
        return <HomeView
          setTab={goTab}
          onOpenDesign={setBuildDesign}
          onPreview={setPreviewDesign}
          onAddFund={() => setTab('wallet')}
        />;
    }
  })();

  return (
    <div className="app-shell">
      {!splashDone && <PanelIntroLoader onComplete={() => setSplashDone(true)} />}

      <TopBar
        tab={tab}
        setTab={goTab}
        user={user}
        isAdmin={isAdmin}
        orderCount={queueCount}
        onAddFund={() => setTab('wallet')}
        onAuth={() => openAuth('login')}
      />

      <main className="app-main">
        <div className="shell-inner">
          {loading && !user && tab !== 'templates' ? (
            <div className="center-pad" style={{ paddingTop: 60 }}>
              <Brand />
              <span className="spinner" />
              <span>Session check ho raha hai…</span>
            </div>
          ) : body}

          {body && <Footer isAdmin={isAdmin} setTab={goTab} />}
        </div>
      </main>

      <BottomNav tab={tab} setTab={goTab} orderCount={queueCount} />

      <AuthModal />

      <BuildWizardModal
        design={buildDesign}
        isOpen={Boolean(buildDesign)}
        onClose={() => setBuildDesign(null)}
        onOrderCreated={() => { setTab('orders'); setBuildDesign(null); }}
        onOpenWallet={() => { setBuildDesign(null); setTab('wallet'); }}
      />

      <TemplatePreview
        design={previewDesign}
        isOpen={Boolean(previewDesign)}
        onClose={() => setPreviewDesign(null)}
        onBuild={(design) => setBuildDesign(design)}
      />

      <LogsModal orderId={logsOrder} isOpen={Boolean(logsOrder)} onClose={() => setLogsOrder(null)} />

      <LiveLinksModal
        order={linksOrder}
        isOpen={Boolean(linksOrder)}
        onClose={() => setLinksOrder(null)}
        onUpdated={() => setLinksOrder(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <StoreProvider>
          <Panel />
        </StoreProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
