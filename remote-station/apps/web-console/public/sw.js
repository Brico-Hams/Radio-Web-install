// Offline shell for the console: runtime-caches static build assets only.
// /api, /healthz, non-GET requests and URLs with a query string are never cached or intercepted (no tokens, no API data).
const CACHE = 'bricohams-console-shell-v1'
const STATIC_PATHS = [/^\/$/, /^\/assets\/[\w.-]+$/, /^\/branding\/[\w.-]+$/, /^\/(?:rx|tx)-audio-worklet\.js$/, /^\/manifest\.webmanifest$/]

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function cacheable(request) {
  if (request.method !== 'GET') return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.search) return false
  return STATIC_PATHS.some((pattern) => pattern.test(url.pathname))
}

self.addEventListener('fetch', (event) => {
  if (!cacheable(event.request)) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((hit) => hit || Response.error())),
  )
})
