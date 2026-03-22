// Aqar Trust — Service Worker
// Handles push notifications and offline caching

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'عقار ثرست', body: 'لديك إشعار جديد', url: '/', icon: '/icons/pwa-192x192.png' };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: '/icons/badge-72.png',
      dir: 'rtl',
      lang: 'ar',
      data: { url: payload.url },
    })
  );
});

// Notification click → open or focus the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// Network-first fetch strategy for API routes; cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and non-same-origin requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API routes → network only
  if (url.pathname.startsWith('/api/')) return;

  // Static assets → stale-while-revalidate
  event.respondWith(
    caches.open('aqar-static-v1').then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((res) => {
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      });
      return cached ?? networkPromise;
    })
  );
});
