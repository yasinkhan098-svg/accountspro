const CACHE_NAME = 'ledgerx-offline-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/auth-bg.png',
];

// Install: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache prefetch warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network first, fallback to cache for offline resilience
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests and API calls (API calls handled by offlineSyncService)
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Cache successful responses for scripts, styles, pages
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(req);
        if (cached) return cached;
        // If navigating to a page, fallback to cached root '/'
        if (req.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }
        return new Response('Offline - No connection', { status: 503, statusText: 'Offline' });
      })
  );
});
