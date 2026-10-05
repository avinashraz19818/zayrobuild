import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import CatalogView from './views/CatalogView';
import OrdersView from './views/OrdersView';
import WalletView from './views/WalletView';
import AdminView from './views/AdminView';
import AuthModal from './components/AuthModal';
import BuildWizardModal from './components/BuildWizardModal';
import LogsModal from './components/LogsModal';
import LiveLinksModal from './components/LiveLinksModal';
import PanelIntroLoader from './components/PanelIntroLoader';

function MainApp() {
  const [activeTab, setActiveTab] = useState('catalog');
  const [introLoading, setIntroLoading] = useState(true);

  // Modals state
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [activeLogsOrderId, setActiveLogsOrderId] = useState(null);
  const [activeLiveLinksOrder, setActiveLiveLinksOrder] = useState(null);

  const handleOrderCreated = (orderId) => {
    setActiveTab('orders');
    setActiveLogsOrderId(orderId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {introLoading && <PanelIntroLoader onComplete={() => setIntroLoading(false)} />}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1 }}>
        {activeTab === 'catalog' && (
          <CatalogView
            onSelectDesign={(design) => setSelectedDesign(design)}
            onPreviewDesign={(design) => setSelectedDesign(design)}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            onOpenLogs={(id) => setActiveLogsOrderId(id)}
            onOpenLiveLinks={(order) => setActiveLiveLinksOrder(order)}
            onViewCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'wallet' && <WalletView />}

        {activeTab === 'admin' && <AdminView />}
      </main>

      {/* Global Modals */}
      <AuthModal />

      <BuildWizardModal
        design={selectedDesign}
        isOpen={!!selectedDesign}
        onClose={() => setSelectedDesign(null)}
        onOrderCreated={handleOrderCreated}
        onOpenWallet={() => {
          setSelectedDesign(null);
          setActiveTab('wallet');
        }}
      />

      <LogsModal
        orderId={activeLogsOrderId}
        isOpen={!!activeLogsOrderId}
        onClose={() => setActiveLogsOrderId(null)}
      />

      <LiveLinksModal
        order={activeLiveLinksOrder}
        isOpen={!!activeLiveLinksOrder}
        onClose={() => setActiveLiveLinksOrder(null)}
        onUpdated={() => {}}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}

