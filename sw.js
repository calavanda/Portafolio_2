/**
 * Service Worker Principal del Portafolio PWA
 * Autor: calavanda
 */

const HUB_CACHE = 'pwa-hub-calavanda-v1';

const HUB_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './common/design-system.css',
  './icons/icon.svg',
  './icons/badge.svg'
];

self.addEventListener('install', (event) => {
  console.log('[Root SW] Instalando Service Worker principal...');
  event.waitUntil(
    caches.open(HUB_CACHE).then((cache) => {
      return cache.addAll(HUB_ASSETS).catch(err => console.warn('Cache error:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Root SW] Activando y tomando control...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== HUB_CACHE).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Stale-while-revalidate for local shell assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const resClone = networkResponse.clone();
          caches.open(HUB_CACHE).then(c => c.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline
      });

      return cachedResponse || fetchPromise;
    })
  );
});
