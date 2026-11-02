// Nazra نظرة — offline-first PWA service worker
// Cache-first for shell assets; network-first for radars.json so updates land.
const V = 'nazra-v3';
const SHELL = ['./', './index.html', './app.css', './app.js',
  './lib/geo.js', './lib/alerts.js', './lib/voice.js', './lib/ui.js',
  './manifest.json', './data/radars.json'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // json = network-first so camera packs refresh when online
  if (url.pathname.endsWith('.json')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(V);
        c.put(req, fresh.clone());
        return fresh;
      } catch { return (await caches.match(req)) || Response.error(); }
    })());
    return;
  }

  // everything else = cache-first
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      const c = await caches.open(V);
      c.put(req, fresh.clone());
      return fresh;
    } catch { return Response.error(); }
  })());
});
