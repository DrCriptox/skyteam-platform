// SKY TEAM — Service Worker v1
var CACHE_NAME = 'skyteam-v1';
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
 
// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
 
  // API calls: always network
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
 
  // Static assets: network first, fallback to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Update cache with fresh response
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(event.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match(OFFLINE_URL);
      });
    })
  );
});
 
// Push notifications (ready for future use with push server)
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data.json(); } catch(e) { data = {title: 'SKY TEAM', body: event.data ? event.data.text() : 'Nueva notificación'}; }
 
  var options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: '/logo-skyteam.png',
    badge: '/logo-skyteam.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'skyteam-notif',
    data: data.data || {},
    actions: data.actions || []
  };
 
  event.waitUntil(
    self.registration.showNotification(data.title || 'SKY TEAM', options)
  );
});
 
// Notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({type:'window'}).then(function(windowClients) {
      for(var i = 0; i < windowClients.length; i++) {
        if(windowClients[i].url.indexOf(url) !== -1) {
          return windowClients[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
