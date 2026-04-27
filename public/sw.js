// Service Worker para Star Family - Versión segura y optimizada
const CACHE_NAME = 'star-family-v1';
const STATIC_CACHE = 'star-family-static-v1';

// Rutas esenciales que siempre deben estar disponibles
const ESSENTIAL_ROUTES = [
  '/',
  '/index.html',
  'https://iili.io/B6XgSSI.jpg'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('SW: Instalando Star Family Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Cacheando rutas esenciales');
        
        // Validar y cachear cada ruta individualmente
        return Promise.all(
          ESSENTIAL_ROUTES.map((url) => {
            // Validar que la URL sea válida
            if (!url || typeof url !== 'string') {
              console.warn('SW: URL inválida ignorada:', url);
              return Promise.resolve();
            }
            
            // Intentar cachear cada ruta individualmente
            return cache.add(url)
              .then(() => {
                console.log('SW: Recurso cacheado exitosamente:', url);
                return Promise.resolve();
              })
              .catch((error) => {
                console.warn('SW: Error cacheando recurso (continuando):', url, error);
                // No romper toda la instalación por un recurso fallido
                return Promise.resolve();
              });
          })
        );
      })
      .catch((error) => {
        console.error('SW: Error general en instalación:', error);
        // Siempre resolver para no romper el SW
        return Promise.resolve();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('SW: Activando Star Family Service Worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('SW: Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estrategia de cache: Network First con fallback a cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo interceptar peticiones HTTP(S) y del mismo origen
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Para rutas esenciales: Network First con fallback a cache
  if (ESSENTIAL_ROUTES.includes(url.pathname) || 
      ESSENTIAL_ROUTES.includes(request.url)) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Si la respuesta es válida, guardar en cache
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('SW: Sirviendo desde cache:', request.url);
                return cachedResponse;
              }
              // Si no hay cache, devolver respuesta de error controlada
              return new Response('Star Family - Sin conexión', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
    return;
  }
  
  // Para otras peticiones: Network Only (no cachear para evitar problemas)
  event.respondWith(fetch(request));
});

// Mensajes desde la aplicación
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('SW: Star Family Service Worker cargado correctamente');
