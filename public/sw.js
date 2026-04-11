const CACHE_NAME = 'lifetycoon-v1';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME));
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      if (resp.ok && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('./')))
  );
});
