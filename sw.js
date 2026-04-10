// SKYTEAM - Service Worker v127
var CACHE_NAME = 'skyteam-v337';
var OFFLINE_URL = '/';

// Install: cache the shell
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/',
        '/index.html',
        '/logo-skyteam.png',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for everything, cache fallback only offline
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls: always network, no cache
  if(url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ok:false,error:'offline'}), {
          headers: {'Content-Type':'application/json'}
        });
      })
    );
    return;
  }

  // HTML pages: ALWAYS fetch fresh, never serve stale cache
  if(event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(c) { return c || caches.match(OFFLINE_URL); });
      })
    );
    return;
  }

  // JS/CSS/images: network first, cache fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(c) { return c || caches.match(OFFLINE_URL); });
    })
  );
});

// Push notifications (server-sent push)
self.addEventListener('push', function(event) {
  var data = {};
  try {
    data = event.data.json();
  } catch(e) {
    data = {
      title: 'SKYTEAM',
      body: event.data ? event.data.text() : 'Nueva notificacion'
    };
  }

  var title = data.title || 'SKYTEAM';
  var body = data.body || 'Tienes una nueva notificacion';

  var options = {
    body: body,
    icon: '/logo-skyteam.png',
    badge: '/logo-skyteam.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'skyteam-notif-' + Date.now(),
    data: data.data || { url: data.url || '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction !== false,
    silent: false,
    image: data.image || null,
    dir: 'ltr',
    lang: 'es'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  if (event.action && event.notification.data && event.notification.data.actions) {
    var action = event.notification.data.actions.find(function(a) { return a.action === event.action; });
    if (action && action.url) {
      url = action.url;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // Find ANY existing app window (same origin)
      for(var i = 0; i < windowClients.length; i++) {
        var c = windowClients[i];
        if(c.url && c.url.indexOf(self.registration.scope) !== -1) {
          c.focus();
          c.postMessage({ type: 'NOTIFICATION_CLICKED', url: url, data: event.notification.data });
          return;
        }
      }
      // No existing window — open new one with nav param
      return clients.openWindow(url);
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});
