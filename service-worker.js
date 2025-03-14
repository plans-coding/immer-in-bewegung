const CACHE_NAME = 'my-cache-v1';
const appPath = '/iib/';
const urlsToCache = [
    appPath,
    appPath + 'index.html',
    appPath + 'about.html',
    appPath + 'dataset.html',
    appPath + 'images.html',
    appPath + 'overview.html',
    appPath + 'search.html',
    appPath + 'statistics.html',
    appPath + 'favicon.webp',
    appPath + 'map.html',
    appPath + 'setup.html',
    appPath + 'trip.html',
    appPath + 'components/menu.html',
    appPath + 'components/footer.html',
    appPath + 'components/iibCharts.js',
    appPath + 'components/iibMaps.js',
    appPath + 'components/iibQueris.js',
];

// Install event - Cache files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
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
