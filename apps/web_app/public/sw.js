// KAP service worker: instant reopen, works on weak internet, and keeps maps usable offline.
const SHELL = 'kap-shell-v3';
const STATIC = 'kap-static-v3';
const MAP = 'kap-map-v1';
const MAP_LIMIT = 6000; // tiles + fonts + sprites (~60–120 MB worst case)
const SHELL_URLS = ['/', '/map', '/offline', '/manifest.webmanifest', '/icon-512.png'];
const MAP_HOSTS = ['tiles.openfreemap.org'];
const PLUGIN_HOSTS = ['unpkg.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => Promise.all(SHELL_URLS.map((u) => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, STATIC, MAP].includes(k)).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    // same-origin pages and CORS map files (style, tilejson) are both worth keeping
    if (res.ok && !res.redirected && (res.type === 'basic' || res.type === 'cors')) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: false })) || (fallbackUrl && (await caches.match(fallbackUrl))) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // map style, vector tiles, fonts, sprites: cache-first so visited and downloaded areas work offline
  if (MAP_HOSTS.includes(url.hostname)) {
    // the style/tilejson can change: refresh in the background but answer from cache when offline
    if (url.pathname.startsWith('/styles/') || url.pathname === '/planet') {
      event.respondWith(networkFirst(req, MAP));
      return;
    }
    event.respondWith(cacheFirst(req, MAP));
    return;
  }
  if (PLUGIN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }
  if (url.origin !== self.location.origin) return; // Supabase etc. always live
  if (url.searchParams.has('_rsc') || url.pathname.startsWith('/_next/data')) return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }
  // map search/routing answers are kept so a repeated search still works offline
  if (url.pathname.startsWith('/api/geo')) {
    event.respondWith(networkFirst(req, MAP));
    return;
  }
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL, url.pathname.startsWith('/map') ? '/map' : '/offline'));
    return;
  }
  event.respondWith(networkFirst(req, SHELL));
});

// "Download this area": the page sends a list of tile URLs; we fetch and keep them.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'kap-prefetch' || !Array.isArray(data.urls)) return;
  const port = event.ports && event.ports[0];
  event.waitUntil(
    (async () => {
      const cache = await caches.open(MAP);
      let done = 0;
      let failed = 0;
      const queue = data.urls.slice();
      const worker = async () => {
        while (queue.length) {
          const u = queue.shift();
          try {
            if (!(await cache.match(u))) {
              const res = await fetch(u, { mode: 'cors' });
              if (res.ok) await cache.put(u, res);
              else failed++;
            }
          } catch (e) {
            failed++;
          }
          done++;
          if (port && done % 10 === 0) port.postMessage({ done, total: data.urls.length, failed });
        }
      };
      await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
      if (port) port.postMessage({ done, total: data.urls.length, failed, finished: true });
      trim(MAP, MAP_LIMIT);
    })(),
  );
});
