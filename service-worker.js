self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("gebärden-cache").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./manifest.json"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});


// Cache Problematik
self.addEventListener("install", event => {
  self.skipWaiting(); // alte Version sofort ersetzen
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key))) // Cache leeren
    )
  );
});
