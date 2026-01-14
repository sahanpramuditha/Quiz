/**
 * Service Worker for QuizMaster
 * Enables offline functionality and background sync
 */

const CACHE_NAME = 'quizmaster-v1';
const STATIC_CACHE = 'quizmaster-static-v1';
const DATA_CACHE = 'quizmaster-data-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/style.css',
    '/assets/js/storage.js',
    '/assets/js/auth.js',
    '/assets/js/questionBank.js',
    '/assets/js/analytics.js',
    '/assets/js/app.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API/data requests
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request).then((response) => {
                    // Cache successful responses
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(DATA_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
    } else {
        // Handle external resources (CDN)
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
    }
});

// Background sync for quiz submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-quiz-results') {
        event.waitUntil(syncQuizResults());
    }
});

async function syncQuizResults() {
    // Get pending results from IndexedDB or localStorage
    // For now, we'll use a simple approach with postMessage
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_RESULTS' });
    });
}

// Message handler for caching quiz data
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_QUIZ_DATA') {
        const quizData = event.data.quiz;
        caches.open(DATA_CACHE).then((cache) => {
            cache.put(new Request(`/quiz/${quizData.id}`), new Response(JSON.stringify(quizData)));
        });
    }
});

