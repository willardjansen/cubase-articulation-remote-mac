'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
