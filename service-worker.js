const CACHE_NAME = "vokabeltrainer-cache-v2"; // erhöhe Version bei Änderungen
const OFFLINE_URLS = [
  "/", 
  "/style.css",
  "/index.html",
  "/script.js",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/favicon-180x180.png"
];

// ===== Installation =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting(); // sofort aktiv werden
});

// ===== Aktivierung (alte Caches löschen) =====
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ===== Fetch-Logik =====
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Wenn das eine Google Sheet oder sonstige API-Abfrage ist → nie cachen
  if (request.url.includes("googleusercontent.com") || request.url.includes("spreadsheets.google.com")) {
    event.respondWith(fetch(request));
    return;
  }

  // Normale Requests → Netzwerk zuerst, dann Cache als Fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Erfolgreiche Antwort im Cache speichern
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});
