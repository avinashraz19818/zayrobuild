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
import AdminApp from './views/admin/AdminApp';
import DeployBotView from './views/DeployBotView';
import TelegramGate from './components/TelegramGate';
import BuildWizardModal from './components/BuildWizardModal';
import TemplatePreview from './components/TemplatePreview';
import LogsModal from './components/LogsModal';
import LiveLinksModal from './components/LiveLinksModal';
import DemoAccountModal from './components/DemoAccountModal';
import PanelIntroLoader from './components/PanelIntroLoader';
import { installGlobalSfx } from './lib/sfx';

const TAB_KEYS = ['home', 'templates', 'fakesite', 'refer', 'orders', 'account', 'wallet', 'deploy'];

// Ye tabs Telegram account ke bina kholne ka koi matlab nahi — in par gate dikhta hai.
const AUTH_TABS = ['orders', 'wallet', 'account', 'refer', 'fakesite', 'deploy'];

function Panel() {
  const { user, isAdmin, loading } = useAuth();
  const { orders, config } = useStore();
  const { addToast } = useToast();

  const [tab, setTab] = useState('home');
  const [splashDone, setSplashDone] = useState(false);
  const [buildDesign, setBuildDesign] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null);
  const [logsOrder, setLogsOrder] = useState(null);
  const [linksOrder, setLinksOrder] = useState(null);
  const [demoOrder, setDemoOrder] = useState(null);

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

  // Build wizard Telegram account ke bina nahi khulta.
  const openBuild = (design) => {
    if (!user) { setTab('account'); return; }
    setBuildDesign(design);
  };

  const body = (() => {
    if (loading && !splashDone) return null;
    if (!loading && !user && AUTH_TABS.includes(tab)) {
      return <TelegramGate botLink={config?.bot_link} />;
    }
    switch (tab) {
      case 'templates':
        return <CatalogView onOpenDesign={openBuild} onPreview={setPreviewDesign} onNeedTelegram={() => setTab('account')} />;
      case 'orders':
        return <OrdersView
          onOpenLogs={(id) => setLogsOrder(id)}
          onOpenLiveLinks={(order) => setLinksOrder(order)}
          onOpenDemoAccounts={(order) => setDemoOrder(order)}
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
      case 'deploy':
        return <DeployBotView setTab={goTab} />;
      case 'home':
      default:
        return <HomeView
          setTab={goTab}
          onOpenDesign={openBuild}
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
        orderCount={queueCount}
        onAddFund={() => setTab('wallet')}
        botLink={config?.bot_link || config?.support_url}
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

          {body && <Footer setTab={goTab} />}
        </div>
      </main>

      <BottomNav tab={tab} setTab={goTab} orderCount={queueCount} />

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

      {/* Demo account — free feature, live links se bilkul alag */}
      <DemoAccountModal
        order={demoOrder}
        isOpen={Boolean(demoOrder)}
        onClose={() => setDemoOrder(null)}
      />
    </div>
  );
}

export default function App() {
  // Har button/pill par halka sound + haptic — ek hi jagah se poore app me.
  useEffect(() => installGlobalSfx(), []);

  // /admin (ya #admin) — alag standalone admin app, store panel ke shell ke bina.
  const isAdminRoute = (() => {
    try {
      const path = String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
      const hash = String(window.location.hash || '').replace(/^#\/?/, '').toLowerCase();
      return path === '/admin' || hash === 'admin';
    } catch (_) { return false; }
  })();

  if (isAdminRoute) {
    return (
      <ToastProvider>
        <AuthProvider>
          <AdminApp />
        </AuthProvider>
      </ToastProvider>
    );
  }


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
