/* ============================================================
   VG.STUDIO — Service Worker v3
   Handles install, caching, offline support
   ============================================================ */

const CACHE_NAME = 'vgstudio-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/192×192.png'
];

/* ── Install: cache core shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // activate immediately
});

/* ── Activate: clear old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // take control of all open tabs
});

/* ── Fetch: cache-first for shell, network-first for MP3s ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let MP3 requests go straight to network (streaming)
  if (url.pathname.endsWith('.mp3')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html
        return caches.match('/index.html');
      });
    })
  );
});
