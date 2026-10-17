// Compiled by build-pwa.mjs. Only public app assets and poster images are cached.
const SHELL_CACHE = '__SHELL_CACHE__'
const IMAGE_CACHE = 'watchpick-posters-v1'
const PRECACHE = /* PRECACHE */[]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(PRECACHE)))
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter(key => key.startsWith('watchpick-shell-') && key !== SHELL_CACHE).map(key => caches.delete(key)))
    await self.clients.claim()
  })())
})
async function cachePoster(request) {
  const cache = await caches.open(IMAGE_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok || response.type === 'opaque') {
      try {
        await cache.put(request, response.clone())
        const keys = await cache.keys()
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 96)).map(key => cache.delete(key)))
      } catch { /* Storage pressure must not prevent displaying an online image. */ }
    }
    return response
  } catch { return new Response('', { status: 503 }) }
}
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || request.headers.has('Authorization')) return
  if (url.origin === self.location.origin && request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) return response
      } catch { /* Use the installed app shell offline. */ }
      return (await caches.match('/index.html', { cacheName: SHELL_CACHE })) || new Response('Visit WatchPick online once to enable offline access.', { status: 503 })
    })())
  } else if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith((async () => (await caches.match(url.pathname, { cacheName: SHELL_CACHE })) || fetch(request))())
  } else if (url.hostname === 'image.tmdb.org' && url.pathname.startsWith('/t/p/') && !url.search) {
    event.respondWith(cachePoster(request))
  }
  // TMDB API, search, credentials, and other cross-origin requests bypass the cache.
})
