// ===================================
// sw.js - Service Worker Elite Capital PWA
// ===================================

const CACHE_NAME = 'elite-capital-v1.0.0';
const API_CACHE_NAME = 'elite-api-v1.0.0';

const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/chat.html',
  '/admin.html',
  '/supabase.js',
  '/manifest.json',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/aos@2.3.1/dist/aos.css',
  'https://unpkg.com/aos@2.3.1/dist/aos.js'
];

// ========== تثبيت Service Worker ==========
self.addEventListener('install', event => {
  console.log('✅ PWA: تثبيت Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ PWA: فتح الذاكرة المؤقتة');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('❌ PWA: فشل تخزين بعض الملفات:', error);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ========== تفعيل Service Worker ==========
self.addEventListener('activate', event => {
  console.log('✅ PWA: تفعيل Service Worker...');
  
  // حذف الإصدارات القديمة
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ PWA: حذف الذاكرة القديمة:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ========== التعامل مع الطلبات ==========
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // تجاهل طلبات Supabase API (تبقى مباشرة)
  if (requestUrl.hostname.includes('supabase.co')) {
    return;
  }
  
  // استراتيجية للصفحات: محاولة الشبكة أولاً، ثم الذاكرة المؤقتة
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // حفظ نسخة في الذاكرة
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // إذا كان طلب صفحة ولم توجد في الذاكرة، أعد توجيه لصفحة offline
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }
  
  // استراتيجية للملفات الثابتة: ذاكرة مؤقتة أولاً، ثم الشبكة
  if (event.request.url.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(response => {
          return response;
        });
      })
    );
    return;
  }
  
  // استراتيجية افتراضية: محاولة الشبكة، مع حفظ في الذاكرة
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // حفظ نسخة من الاستجابات الناجحة فقط
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ========== استقبال الإشعارات ==========
self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'لديك إشعار جديد من Elite Capital',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/dashboard.html',
        dateOfArrival: Date.now()
      },
      actions: [
        {
          action: 'open',
          title: 'فتح التطبيق'
        },
        {
          action: 'close',
          title: 'إغلاق'
        }
      ],
      dir: 'rtl',
      lang: 'ar'
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Elite Capital',
        options
      )
    );
  } catch (error) {
    console.error('❌ PWA: خطأ في معالجة الإشعار:', error);
  }
});

// ========== النقر على الإشعار ==========
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const urlToOpen = event.notification.data?.url || '/dashboard.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // إذا كان هناك نافذة مفتوحة بالفعل، ركز عليها
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // وإلا افتح نافذة جديدة
      return clients.openWindow(urlToOpen);
    })
  );
});

// ========== مزامنة الخلفية (Background Sync) ==========
self.addEventListener('sync', event => {
  if (event.tag === 'sync-messages') {
    console.log('✅ PWA: مزامنة الرسائل في الخلفية');
    event.waitUntil(syncMessages());
  }
});

// دالة مساعدة لمزامنة الرسائل (يمكن تطويرها لاحقاً)
async function syncMessages() {
  // هنا يمكن إضافة منطق لمزامنة الرسائل غير المرسلة
  console.log('جاري مزامنة الرسائل...');
}

console.log('✅ PWA: تم تحميل Service Worker بنجاح');