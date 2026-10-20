const CACHE = 'sde-vial-v1';
const SHELL = ['/', '/reportes', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((clave) => clave !== CACHE).map((clave) => caches.delete(clave)))).then(() => self.clients.claim())
  );
});

const esTile = (url) =>
  /tile\.openstreetmap\.org|server\.arcgisonline\.com|tile\.opentopomap\.org/.test(url.hostname);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (esTile(url)) {
    event.respondWith(
      caches.open('sde-tiles-v1').then(async (cache) => {
        const guardada = await cache.match(request);
        if (guardada) return guardada;
        try {
          const respuesta = await fetch(request);
          if (respuesta.ok) {
            const claves = await cache.keys();
            if (claves.length > 800) await cache.delete(claves[0]);
            cache.put(request, respuesta.clone());
          }
          return respuesta;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
          return respuesta;
        })
        .catch(() => caches.match(request).then((guardada) => guardada ?? caches.match('/')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (guardada) =>
          guardada ??
          fetch(request).then((respuesta) => {
            if (respuesta.ok) caches.open(CACHE).then((cache) => cache.put(request, respuesta.clone()));
            return respuesta;
          })
      )
    );
  }
});
