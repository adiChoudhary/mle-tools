/**
 * Service Worker for DevToolbox — static asset caching strategy.
 *
 * Uses a Cache-First strategy for static assets (CSS, JS, images, fonts)
 * and Stale-While-Revalidate for HTML pages.
 * Includes offline fallback and cache versioning.
 */

/* eslint-disable no-restricted-globals */

const CACHE_NAME = `devtoolbox-v2`;
const RUNTIME_CACHE = `devtoolbox-runtime-v1`;

/** URLs to precache on install */
const URLs_TO_PRECACHE = ['/', '/favicon.svg', '/favicon.ico'];

/** Regex patterns for cache-first assets */
const CACHE_FIRST_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\/_astro\//,
];

/** Regex patterns for stale-while-revalidate (HTML pages) */
const STALE_WHILE_REVALIDATE_PATTERNS = [/^\/tools\//, /^\/$/];

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
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
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

  // Only handle GET requests for same-origin
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // Skip non-navigation non-resource requests
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request));
  } else if (CACHE_FIRST_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(cacheFirst(request));
  } else if (STALE_WHILE_REVALIDATE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Cache-First strategy: serve from cache, fetch and cache if miss.
 * Used for static assets (CSS, JS, images, fonts).
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok && fresh.status === 200) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    // Return offline fallback for critical resources
    if (request.destination === 'document') {
      return caches.match('/');
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale-While-Revalidate strategy: serve from cache immediately,
 * update cache in background.
 * Used for HTML pages.
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // If fetch fails, return cached version or fallback
      if (cached) return cached;
      return caches.match('/');
    });

  return cached || fetchPromise;
}

// ── Background Sync (optional) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Placeholder for background sync operations
  // e.g., syncing user preferences or analytics
}

// ── Push Notifications (optional) ──
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'DevToolbox', body: 'New update available' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
    })
  );
});

// ── Notification Click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
