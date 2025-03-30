const CACHE_NAME = 'immer-in-bewegung-cache-1';


const urlsToCache = [
    './',
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

    'bundle/fonts/Cairo-VariableFont_slnt,wght.ttf',
    'bundle/fonts/Righteous-Regular.ttf',

    'img/car.svg',
    'img/coordinate.svg',
    'img/frog.svg',
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

/*
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {
        // Skip caching for Leaflet tile requests
        if (event.request.url.includes('tile.openstreetmap.org')) {
          return fetch(event.request);
        }

        // Check if the requested resource is available in cache
        const response = await caches.match(event.request);

        // If the resource is available in cache, return it
        if (response) {
          return response;
        }

        // If not available in cache, try fetching from the network
        const networkResponse = await fetch(event.request);

        // If the network request is successful, cache the response and return it
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());

        return networkResponse;
      } catch (error) {
        // If the resource is not available (both in cache and network), drop the request
        console.warn(`Resource not available: ${event.request.url}`);
        return new Response('Resource not found', { status: 404 });
      }
    })()
  );
});*/

self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async () => {
      try {

        if (event.request.url === 'https://raw.githubusercontent.com/plans-coding/immer-in-bewegung/refs/heads/main/version') {
          return fetch(event.request);
        }

        if (event.request.url.includes('tile.openstreetmap.org')) {
          return fetch(event.request);
        }

        // Normalize URL by stripping query parameters (optional, depends on needs) to handle eg ?p=map&country=Sweden
        const url = new URL(event.request.url);
        url.search = ''; // Remove all query parameters

        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(url.toString());

        if (response) {
          return response;
        }

        // Fetch from network
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());

        return networkResponse;
      } catch (error) {
        console.warn(`Resource not available: ${event.request.url}`);
        return new Response('Resource not found', { status: 404 });
      }
    })()
  );
});



