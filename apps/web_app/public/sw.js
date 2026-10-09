const CACHE_NAME = 'kap-shell-v2';
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

// Only the app's own GET requests are handled. Cross-origin traffic (Supabase API,
// map search/routing, map tiles) goes straight to the network: user data and ride
// state are never written to the device cache, and map tiles don't fill storage.
// Network-first, with a cache fallback only when the network truly fails (weak internet).
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/data') || url.searchParams.has('_rsc')) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => (await caches.match(req)) || (await caches.match('/')) || Response.error())
  );
});
