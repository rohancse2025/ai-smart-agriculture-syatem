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

const DB_NAME = 'kisancore-db';
const STORE_NAME = 'sync-queue';

// IndexedDB Helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToQueue(request) {
  const db = await openDB();
  const body = await request.clone().text();
  const data = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: body,
    timestamp: Date.now()
  };
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replayQueue() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const requests = await new Promise(resolve => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  if (requests.length === 0) return;

  let successCount = 0;
  for (const req of requests) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body
      });
      
      if (response.ok) {
        const deleteTx = db.transaction(STORE_NAME, 'readwrite');
        deleteTx.objectStore(STORE_NAME).delete(req.id);
        successCount++;
      }
    } catch (err) {
      console.error('Failed to replay request:', err);
    }
  }

  if (successCount > 0) {
    const clients = await self.clients.matchAll();
    clients.forEach(client => client.postMessage({ type: 'SYNC_DONE', count: successCount }));
  }
}

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
  const isApi = url.pathname.startsWith('/api/');
  const isAuth = url.pathname.includes('/auth/login') || url.pathname.includes('/auth/register');
  const isPostPut = ['POST', 'PUT'].includes(event.request.method);

  if (isApi) {
    if (isPostPut && !isAuth) {
      // Special handling for POST/PUT Background Sync
      event.respondWith(
        fetch(event.request.clone())
          .catch(async () => {
             const path = new URL(event.request.url).pathname;
             const isAiFeature = path.includes('/api/v1/chat') || path.includes('/api/v1/crops');
             
             if (isAiFeature) {
               return new Response(
                 JSON.stringify({ 
                   offline: true, 
                   error: "You are offline. Please reconnect to use AI features." 
                 }),
                 { headers: { 'Content-Type': 'application/json' }, status: 200 }
               );
             }

             await saveToQueue(event.request);
             if ('sync' in self.registration) {
               await self.registration.sync.register('kisancore-sync');
             }
             return new Response(
               JSON.stringify({ error: "offline", queued: true }),
               { headers: { 'Content-Type': 'application/json' }, status: 202 }
             );
          })
      );
    } else {
      // Normal API fetch (GET or Auth)
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (event.request.method === 'GET') {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => 
            caches.match(event.request)
              .then(cached => cached || new Response(
                JSON.stringify({error: "offline", offline: true}),
                {headers: {'Content-Type': 'application/json'}}
              ))
          )
      );
    }
    return;
  }
  
  // App Shell / Static Assets
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

self.addEventListener('sync', event => {
  if (event.tag === 'kisancore-sync') {
    event.waitUntil(replayQueue());
  }
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
