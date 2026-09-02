const CACHE = 'local-data-workbench-site-v5';
// Vite replaces this development list with every hashed site JS/CSS asset at
// production build time. Keeping the dev module paths here lets the same
// cold-landing offline check exercise Vite's local server too.
const PRECACHE_ASSETS = ['/main.ts', '/demo.ts', '/site.css'];
const SHELL = [
  '/', '/demo/', '/privacy/', '/terms/', '/404.html',
  '/assets/hero-ledger-640.webp', '/assets/hero-ledger-960.webp',
  '/assets/walkthrough-open-sample.jpg', '/assets/walkthrough-name-filter.jpg', '/assets/walkthrough-export-result.jpg',
  ...PRECACHE_ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  // The app shell is immutable for this cache version. Serve it cache-first so
  // a cold offline navigation never attempts the network for the demo module.
  if (SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then((cache) => cache.match(url.pathname)).then((cached) => cached || fetch(event.request)));
    return;
  }
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok && url.pathname !== '/sw.js') {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => {
    if (cached) return cached;
    // Only navigations can use the landing document as an offline fallback.
    // Returning HTML for a missing module produces a MIME error and a blank UI.
    if (event.request.mode === 'navigate') return caches.match('/');
    return Response.error();
  })));
});
