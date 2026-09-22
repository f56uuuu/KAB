'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registration failure (unsupported browser, dev-mode HTTP, etc.)
        // should never break the app itself — the PWA install prompt just
        // won't appear, which is a degrade, not a failure.
      });
    }
  }, []);

  return null;
}
