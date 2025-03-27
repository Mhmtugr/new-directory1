/**
 * MehmetEndustriyelTakip Service Worker
 * Çevrimdışı çalışma ve PWA desteği için
 */

const CACHE_NAME = 'mehmet-industrial-cache-v1';
const OFFLINE_URL = 'offline.html';

// Önbelleğe alınacak dosyalar
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/core/app.js',
  '/core/main.js',
  '/core/mock-firebase.js',
  '/core/compat-check.js',
  '/core/firebase-config.js',
  '/core/database.js',
  '/core/styles/main.css',
  '/utils/event-bus.js',
  '/services/api-service.js',
  '/services/erp-service.js',
  '/services/ai-service.js',
  '/modules/dashboard/dashboard.js',
  '/modules/orders/orders.js',
  '/modules/production/production.js',
  '/modules/purchasing/purchasing.js',
  '/modules/inventory/inventory.js',
  '/modules/ai/chatbot.js',
  '/modules/ai/ai-analytics.js',
  '/modules/ai/ai-integration.js',
  '/modules/ai/advanced-ai.js',
  '/modules/ai/data-viz.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Service Worker Yükleme
self.addEventListener('install', event => {
  console.log('Service Worker yükleniyor...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Dosyalar önbelleğe alınıyor...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker kurulumu tamamlandı');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Önbellekleme hatası:', error);
      })
  );
});

// Service Worker Aktivasyon
self.addEventListener('activate', event => {
  console.log('Service Worker aktifleştiriliyor...');
  
  // Eski önbellekleri temizle
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek temizleniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker artık aktif ve kontrolü ele aldı');
      return self.clients.claim();
    })
  );
});

// Fetch İsteklerini Yakalama
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Aynı kaynak kontrolleri
  const isSameOrigin = url.origin === self.location.origin;
  
  // API istekleri için özel işlem
  if (url.pathname.startsWith('/api/')) {
    return; // API isteklerini işleme, normal ağ isteklerine bırak
  }
  
  // Navigasyon istekleri
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('Navigasyon isteği başarısız, çevrimdışı sayfasına yönlendiriliyor');
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // Önbelleklenmiş statik varlıklar için "Cache First" stratejisi
  if (
    isSameOrigin &&
    ASSETS_TO_CACHE.some(asset => url.pathname === asset || url.pathname === asset.replace(/^\//, ''))
  ) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          console.log('Önbellekte bulunmayan dosya talep ediliyor:', url.pathname);
          return fetch(event.request)
            .then(response => {
              // Geçerli bir yanıt alındıysa önbelleğe al
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(err => {
              console.error('Fetch hatası:', err);
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Diğer istekler için "Network First" stratejisi
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // HTML istekleri için offline sayfasını göster
            if (event.request.headers.get('Accept').includes('text/html')) {
              return caches.match(OFFLINE_URL);
            }
            
            // Diğer kaynaklar için 404 döndür
            return new Response('Kaynak bulunamadı ve önbellekte yok', {
              status: 404,
              statusText: 'Not Found'
            });
          });
      })
  );
});

// Push Bildirim İşleme
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    // Varsayılan bildirim içeriği
    const title = data.title || 'MehmetEndüstriyelTakip';
    const options = {
      body: data.body || 'Yeni bir bildiriminiz var',
      icon: data.icon || '/assets/icons/icon-192x192.png',
      badge: data.badge || '/assets/icons/badge-72x72.png',
      data: { url: data.url || '/' }
    };
    
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error('Push bildirim işleme hatası:', error);
  }
});

// Bildirime Tıklama
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        const url = event.notification.data.url || '/';
        
        // Zaten açık olan bir pencere varsa odaklan
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Yoksa yeni bir pencere aç
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Çalışıyorum mesajı
console.log('Service Worker çalışıyor!');