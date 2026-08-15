/**
 * Service Worker for DevToolbox — static asset caching strategy.
 *
 * Uses a Stale-While-Revalidate strategy for HTML pages
 * and Cache-First for static assets (CSS, JS, images, fonts).
 *
 * All data processing is client-side, so no API caching needed.
 */

const CACHE_NAME = `devtoolbox-v${self.__BUILD_VERSION__ || '1'}`;
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/favicon.ico',
];

/** URLs to always cache on install */
const URLs_TO_PRECACHE = STATIC_ASSETS;

/** Regex patterns for cache-first assets */
const CACHE_FIRST_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.svg$/,
  /\.png$/,
  /\.woff2?$/,
  /\/_astro\//,  // Astro built assets
];

/** Regex patterns for stale-while-revalidate */
const STALE_WHILE_REVALIDATE_PATTERNS = [
  /^\/tools\//,
  /^\/$/,
];

// ── Install ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-same-origin requests
  if (url.origin !== location.origin) return;

  // Cache-first for static assets
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stale-while-revalidate for HTML pages
  if (STALE_WHILE_REVALIDATE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

/**
 * Cache-First strategy: serve from cache if available,
 * otherwise fetch and cache.
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate: serve cached version immediately
 * while updating cache in background.
 */
async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
