const CACHE = 'chronik-v9';

// Resolve absolute URLs relative to the SW's own location so the SW works
// correctly no matter what path the app is served from.
const BASE = new URL('./', self.location.href).href;
const SHELL = [
  BASE,
  BASE + 'index.html',
  BASE + 'url-sync.js',
  BASE + 'languages/english.json',
  BASE + 'favicon.svg',
  BASE + 'icon.svg',
  BASE + 'manifest.json',
];

// Install: pre-cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete stale caches, take control of all clients immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch strategy:
//   • User data JSON files → bypass (always network, always fresh)
//   • Same-origin requests  → cache-first; populate cache on miss
//   • Cross-origin (CDN)    → network-first; fall back to cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.cache === 'no-store') return;

  const url = new URL(e.request.url);

  // Refresh navigation while online, and retain the complete shell for offline
  // restarts. Data reads explicitly use no-store and never enter this cache.
  if (e.request.mode === 'navigate' || url.href.startsWith(BASE + 'languages/')) {
    e.respondWith(fetch(e.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, copy));
      }
      return response;
    }).catch(async () => await caches.match(e.request) || await caches.match(BASE + 'index.html')));
    return;
  }

  // Skip user data JSON files (they change; let the browser handle them)
  if (
    url.pathname.endsWith('.json') &&
    !url.pathname.endsWith('manifest.json')
  ) return;

  // Keep the install metadata current so Android standalone apps receive
  // updated theme and background colors.
  if (url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Cache-first: return cached copy if available, otherwise fetch & cache
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => {
          // Navigation fallback: serve the app shell
          if (e.request.mode === 'navigate') {
            return caches.match(BASE + 'index.html');
          }
        });
      })
    );
  } else {
    // Network-first for CDN assets (fonts, MapLibre, etc.); cache as fallback
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
