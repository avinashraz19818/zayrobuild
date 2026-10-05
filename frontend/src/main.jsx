import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme.css'
import App from './App.jsx'

// Globally attach Authorization Bearer token to all fetch requests
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  try {
    const token = localStorage.getItem('zayro_token');
    if (token) {
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init.headers = headers;
    }
  } catch (_) {}
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
