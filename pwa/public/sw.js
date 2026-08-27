const CACHE_NAME = 'shotten-v4';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
];

// Install event - cache offline page
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch event - network first, fallback to cache, then offline page
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only handle same-origin app requests.
    if (url.origin !== self.location.origin) return;

    // Skip API requests - they should always go to network
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Next.js app-router data/RSC requests must not be cached as page responses.
    if (
        event.request.headers.get('RSC') === '1' ||
        event.request.headers.get('Next-Router-Prefetch') === '1' ||
        url.searchParams.has('_rsc')
    ) {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put('/', responseClone);
                        });
                    }
                    return response;
                })
                .catch(async () => {
                    const cachedShell = await caches.match('/');
                    if (cachedShell) {
                        return cachedShell;
                    }

                    const offlinePage = await caches.match(OFFLINE_URL);
                    if (offlinePage) {
                        return offlinePage;
                    }

                    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                })
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(async () => {
                // Try cache first
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Return a simple error for other requests
                return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            })
    );
});

self.addEventListener('push', (event) => {
    let title = 'Shotten';
    let options = {
        body: 'New update',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: { url: '/' },
    };

    try {
        if (event.data) {
            const payload = event.data.json();
            title = payload.title || title;
            options = {
                ...options,
                body: payload.body || options.body,
                tag: payload.tag || 'shotten',
                data: payload.data || options.data,
            };
        }
    } catch {
        if (event.data) {
            options.body = event.data.text();
        }
    }

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
