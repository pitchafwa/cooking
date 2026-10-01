// Offline cache. Pages: network first (always the newest app, falls back offline).
// Everything else on this site (app files, recipe data): serve from cache instantly, refresh in the background.
const APP = 'kitchen-app-v1';
const FONTS = 'kitchen-fonts-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== APP && k !== FONTS) await caches.delete(k);
  await self.clients.claim();
})()));

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(FONTS, req));
    return;
  }
  if (url.origin !== self.location.origin) return; // Firebase and anything else: leave to the network

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) || (await cache.match(self.registration.scope)) || (await cache.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(staleWhileRevalidate(APP, req));
});
