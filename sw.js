const CACHE_NAME = 'drive-collector-v5'; // Versie verhoogd voor systeem-update
const TILE_CACHE_NAME = 'map-tiles-v1';  // Speciale cache voor de offline kaarten
const ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Installeer bibliotheken die nooit veranderen
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); 
});

// Ruim oude caches op bij een update
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // UPGRADE 3: Cache-First voor OpenStreetMap Kaarttegels
  if (url.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          // Als de tegel in de cache zit (bijvoorbeeld via wifi bekeken), gebruik hem direct!
          if (cachedResponse) {
            return cachedResponse; 
          }
          // Zo niet, haal hem op van internet en sla hem op in de cache voor later offline gebruik
          return fetch(e.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Offline en niet gecacht? Geef een lege status terug (kaart blijft daar grijs/leeg)
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return; // Stop de verdere afhandeling voor deze request
  }

  // Standaard afhandeling voor index.html en manifest.json (Network-First)
  if (e.request.mode === 'navigate' || url.includes('index.html') || url.includes('manifest.json')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) 
    );
  } else {
    // Cache-First voor Leaflet bestanden zelf
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request);
      })
    );
  }
});