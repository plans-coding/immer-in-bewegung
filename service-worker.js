const CACHE_NAME = 'immer-in-bewegung-cache-1';
const urlsToCache = [
    'favicon.webp',
    'index.html',

    'about.html',
    'dataset.html',
    'images.html',
    'overview.html',
    'search.html',
    'statistics.html',
    'map.html',
    'source.html',
    'trip.html',

    'components/menu.html',
    'components/footer.html',
    'components/iibCharts.js',
    'components/iibMaps.js',
    'components/iibQueries.js',

    'bundle/sqljs/sql-wasm.js',
    'bundle/sqljs/sql-wasm.wasm',
    'bundle/bootstrap/bootstrap.bundle.5.3.3.min.js',
    'bundle/chartjs/chart.js',

    'bundle/liquidjs/liquid.browser.min.js',

    'bundle/leaflet/leaflet.1.9.4.min.css',
    'bundle/leaflet/Control.FullScreen.4.0.0.css',
    'bundle/leaflet/leaflet-src.1.9.4.min.js',
    'bundle/leaflet/Control.FullScreen.4.0.0.js',
    'bundle/leaflet/leaflet.polylineDecorator.1.6.0.min.js',
    'bundle/leaflet/icon-fullscreen.svg',

    'img/car.svg',
    'img/coordinate.svg',
    'img/frog_g_72.webp',
    'img/frog_g_150.webp',
    'img/house.svg',
    'img/immich-logo-inline-dark-small.png',

    'personal/settings.json',
    'personal/languages.txt',
    'personal/swedish.json',
    'personal/danish.json',
    'personal/german.json',
    'personal/dutch.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache)
                    .catch(err => {
                        console.error('Caching failed:', err);
                        urlsToCache.forEach(async url => {
                            try {
                                await cache.add(url);
                            } catch (error) {
                                console.error(`Failed to cache ${url}:`, error);
                            }
                        });
                    });
            })
    );
});

// Activate event - Cleanup old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        })
    );
});

// Fetch event - Serve files from cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
