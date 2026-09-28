const CACHE_NAME = 'dkitchen-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/assets/brand/logo.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((response) => { if (response.ok) return cache.put(url, response); })
            .catch(() => {})
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => {
        if (name !== CACHE_NAME) {
          console.log('[SW] Purging outdated cache:', name);
          return caches.delete(name);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// Network-first con prioridad absoluta a red para navegación
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response('Offline: recurso no disponible.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        })
      )
  );
});

// Notificaciones push
self.addEventListener('push', () => {
  const title = 'Actualización de Pedido';
  const options = {
    body: 'Tu pedido ha cambiado de estado. Abre la app para ver los detalles.',
    icon: '/assets/brand/logo.svg',
    badge: '/assets/brand/logo.svg',
    tag: 'brand-order-update'
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
