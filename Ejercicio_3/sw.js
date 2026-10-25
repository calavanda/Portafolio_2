/**
 * Service Worker - Ejercicio 3: Notificaciones Push Locales
 * Autor: calavanda
 */

const SW_VERSION = 'v1.0.0-notif-calavanda';

self.addEventListener('install', (event) => {
  console.log(`[SW Notif] Instalando Service Worker ${SW_VERSION}`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW Notif] Activado y tomando control inmediato`);
  event.waitUntil(self.clients.claim());
});

// Listener for custom notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Notif] Click detectado en notificación:', event.notification.tag);
  
  const action = event.action;
  const notification = event.notification;
  notification.close();

  // Focus existing open tab or open a new window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./index.html');
      }
    })
  );
});

// Optional message listener to trigger notification directly from SW context
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    self.registration.showNotification(title, options);
  }
});
