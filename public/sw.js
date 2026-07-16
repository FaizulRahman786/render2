const CACHE_NAME = 'coachpro-assets-v1';
const FALLBACK_ASSETS = ['/manifest.json', '/offline.html', '/icon-192.svg', '/icon-512.svg'];

// At install we will fetch `/precache-manifest.json` (generated at build time)
// and cache the listed files. If the manifest is missing, we fall back to
// caching the small `FALLBACK_ASSETS` set to avoid failure.

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const res = await fetch('/precache-manifest.json');
        if (res.ok) {
          const list = await res.json();
          await cache.addAll(list);
          return;
        }
      } catch (e) {}
      try { await cache.addAll(FALLBACK_ASSETS); } catch (e) {}
    })()
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache API calls or auth
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: try network first, fallback to offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          return res;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Cache-first for static assets (manifest, icons)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Push notification support (future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'CoachPro', {
      body: data.message || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
    })
  );
});
