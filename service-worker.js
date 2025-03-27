/**
 * MehmetEndustriyelTakip Service Worker
 * Çevrimdışı çalışma ve PWA desteği için
 */

const CACHE_NAME = 'mehmet-endustriyel-takip-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/utils/event-bus.js',
  '/services/api-service.js',
  '/services/erp-service.js',
  '/services/ai-service.js',
  '/config/app-config.js',
  '/core/main.js',
  '/core/app.js',
  '/core/compat-check.js',
  '/core/firebase-config.js',
  '/core/mock-firebase.js',
  '/core/database.js',
  '/core/styles/main.css',
  '/modules/dashboard/dashboard.js',
  '/modules/orders/orders.js',
  '/modules/production/production.js',
  '/modules/purchasing/purchasing.js',
  '/modules/inventory/inventory.js',
  '/modules/ai/chatbot.js',
  '/modules/ai/ai-integration.js',
  '/modules/ai/advanced-ai.js',
  '/modules/ai/ai-analytics.js',
  '/modules/ai/data-viz.js',
  '/assets/icons/favicon.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-384x384.png',
  '/assets/icons/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js'
];

// Service Worker Kurulumu
self.addEventListener('install', event => {
  console.log('Service Worker kurulmaya başlıyor');
  
  // Sayfa önbelleğe alınıyor
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Önbellek oluşturuldu');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('Assets önbelleğe alındı');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Önbelleğe alma hatası:', error);
        // Hata olsa bile service worker kurulumuna devam et
        return self.skipWaiting();
      })
  );
});

// Service Worker Aktifleştirme
self.addEventListener('activate', event => {
  console.log('Service Worker aktifleştiriliyor');
  
  // Eski önbellekleri temizleme
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Eski önbellek siliniyor:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Service worker tüm istemciler üzerinde aktif hale getirilir
      return self.clients.claim();
    })
  );
});

// İstekleri Yakalama
self.addEventListener('fetch', event => {
  // Sadece GET isteklerini önbelleğe al
  if (event.request.method !== 'GET') return;
  
  // API isteklerini önbellekleme - Firebase ve diğer API'ler dışında
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') || 
      event.request.url.includes('firebase-settings')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Önbellekte varsa hemen dön
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Yoksa ağdan getir ve önbelleğe al
        return fetch(event.request)
          .then(response => {
            // Yanıt geçersizse, direkt dön
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Yanıtın klonunu al ve önbelleğe kaydet
            let responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            // Ağ erişimi yoksa ve önbellekte de yoksa offline sayfasını dön
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
                .then(offlineResponse => {
                  return offlineResponse || new Response('İnternet bağlantısı yok', {
                    status: 503,
                    statusText: 'İnternet bağlantısı yok'
                  });
                });
            }
            
            console.error('Fetch hatası:', error);
            throw error;
          });
      })
  );
});

// Push Bildirimleri Alma
self.addEventListener('push', event => {
  console.log('Push alındı:', event);
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const title = data.title || 'MehmetEndustriyelTakip';
    const options = {
      body: data.message || 'Yeni bir bildiriminiz var',
      icon: data.icon || '/assets/icons/favicon.png',
      badge: '/assets/icons/favicon.png',
      data: {
        url: data.url || '/'
      },
      actions: data.actions || []
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Push bildirimi işleme hatası:', error);
  }
});

// Bildirim Tıklama
self.addEventListener('notificationclick', event => {
  console.log('Bildirim tıklandı:', event);
  
  event.notification.close();
  
  // Tıklanınca belirli bir URL'ye yönlendirme
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(windowClients => {
      // Açık bir pencere varsa odaklan
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Yoksa yeni pencere aç
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Çalışıyorum mesajı
console.log('Service Worker çalışıyor!');