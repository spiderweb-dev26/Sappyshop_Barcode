import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with automatic update detection
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // When a new build is detected, immediately update and reload
    updateSW(true);
  },
  onOfflineReady() {
    console.log('Sappy POS is ready for offline operation.');
  },
});

// Auto-reload when new service worker takes control so published updates take effect immediately
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  // Check for updates when user returns to the tab or app window
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          reg.update().catch(() => {});
        }
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
