/**
 * Service Worker - Ejercicio 5: Estrategia de Caché Dinámica
 * Autor: calavanda
 */

const CACHE_NAME = 'pwa-networkfirst-calavanda-v1';
const DYNAMIC_API_CACHE = 'dynamic-api-v1';

// Static resources to precache
const PRECACHE_ASSETS = [
  './index.html',
  './styles.css',
  './app.js',
  './db.js',
  '../common/design-system.css',
  '../icons/icon.svg'
];

self.addEventListener('install', (event) => {
  console.log('[SW E5] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW E5] Error precacheando assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW E5] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== DYNAMIC_API_CACHE).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler implementing Network-First strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If requesting REST API data (e.g., dummyjson, jsonplaceholder)
  if (url.origin.includes('dummyjson.com') || url.origin.includes('jsonplaceholder.typicode.com')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Clone and store in Cache API
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_API_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // Network failed, attempt to return from Cache API
          return caches.match(event.request);
        })
    );
    return;
  }

  // Stale-while-revalidate for local assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
      });

      return cachedResponse || fetchPromise;
    })
  );
});
