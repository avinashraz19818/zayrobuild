import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme.css';
import './animated-icons.css';
import './welcome-bot.css';
import './premium-polish.css';
import './store-experience.css';
import './deposit.css';
import App from './App.jsx';
import PanelErrorBoundary from './components/PanelErrorBoundary';
import { retainBootLoader } from './lib/boot-loader';

retainBootLoader();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PanelErrorBoundary><App /></PanelErrorBoundary>
  </StrictMode>
);
