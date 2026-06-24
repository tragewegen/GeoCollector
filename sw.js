const CACHE_NAME = 'drive-collector-v3'; // Versie verhoogd
const ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installeer enkel de externe bibliotheken die nooit veranderen
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Activeer de nieuwe service worker direct
});

// Network-First voor index.html en manifest.json, zodat updates direct doorkomen
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate' || e.request.url.includes('index.html') || e.request.url.includes('manifest.json')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // Alleen bij écht offline zijn de cache gebruiken
    );
  } else {
    // Cache-First voor de Leaflet kaartbestanden
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request);
      })
    );
  }
});