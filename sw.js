/**
 * PDF Studio - Service Worker
 * Çevrimdışı önbellekleme ve PWA desteği
 */

const CACHE_NAME = 'pdf-studio-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './vendor/fontkit.umd.min.js',
  './vendor/pdf-lib.min.js',
  './vendor/font-sans.js',
  './vendor/pdf.min.js',
  './vendor/pdf.worker.min.js'
];

// Yükleme & Önbelleğe Alma
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Kaynaklar önbelleğe alınıyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => {
      console.warn('[Service Worker] Önbellekleme uyarısı:', err);
    })
  );
});

// Etkinleştirme & Eski Önbellekleri Temizleme
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Eski önbellek siliniyor:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// İstekleri Yakalama (Stale-While-Revalidate / Cache First)
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini işle
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Ağ yoksa ve önbellek varsa önbellek dönecektir
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
