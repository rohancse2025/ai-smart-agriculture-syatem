const CACHE_NAME = 'kisancore-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/crops',
  '/scan',
  '/iot',
  '/market',
  '/chat',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => 
      cache.addAll(APP_SHELL).catch(e => 
        console.log('Cache install error:', e))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys
        .filter(k => k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put(event.request, clone));
          return response;
        })
        .catch(() => 
          caches.match(event.request)
            .then(cached => cached || new Response(
              JSON.stringify({error: "offline",
                offline: true}),
              {headers: {'Content-Type': 
                'application/json'}}
            ))
        )
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || 
        fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, clone));
            return response;
          })
      )
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
