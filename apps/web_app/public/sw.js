const CACHE_NAME = 'kap-shell-v1';
// Keep this list tiny and static — the goal is instant reopen + an offline
// fallback shell, not full offline app functionality (which needs the live
// Supabase connection anyway for anything that matters: prices, ride status).
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for everything (this is a live app, staleness is worse than
// a spinner) with a cache fallback only when the network truly fails —
// covers the "weak internet" case (section 90) without ever serving stale
// prices or ride state when a connection exists.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
