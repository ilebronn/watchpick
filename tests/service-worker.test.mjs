import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function workerHarness() {
  const origin = 'https://watchpick.test'
  const stores = new Map()
  const handlers = new Map()
  let online = true
  let fetches = 0
  const key = value => new URL(typeof value === 'string' ? value : value.url, origin).href
  async function open(name) {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)
    return {
      async addAll(urls) { for (const url of urls) store.set(key(url), new Response(url === '/index.html' ? '<html>WatchPick offline library</html>' : 'public asset')) },
      async match(request) { return store.get(key(request))?.clone() },
      async put(request, response) { store.set(key(request), response.clone()) },
      async keys() { return [...store.keys()].map(url => ({ url })) },
      async delete(request) { return store.delete(key(request)) },
    }
  }
  const caches = {
    open, async keys() { return [...stores.keys()] }, async delete(name) { return stores.delete(name) },
    async match(request, options) {
      if (options?.cacheName) return (await open(options.cacheName)).match(request)
      for (const store of stores.values()) if (store.has(key(request))) return store.get(key(request)).clone()
    },
  }
  const source = (await readFile('scripts/service-worker.js', 'utf8')).replace("'__SHELL_CACHE__'", "'watchpick-shell-test'").replace('/* PRECACHE */[]', JSON.stringify(['/index.html', '/assets/app.js']))
  const self = { location: { origin }, clients: { async claim() {} }, addEventListener(name, handler) { handlers.set(name, handler) } }
  vm.runInNewContext(source, { self, caches, URL, Response, fetch: async () => { fetches++; if (!online) throw Error('offline'); return new Response('online data') } })
  async function dispatch(name, request) {
    const waiting = []
    let response = null
    handlers.get(name)({ request, waitUntil(promise) { waiting.push(promise) }, respondWith(promise) { response = Promise.resolve(promise) } })
    await Promise.all(waiting)
    return response ? await response : null
  }
  return { dispatch, caches, stores, setOffline() { online = false }, fetches: () => fetches, origin }
}

function request(url, { mode = 'cors', authorization = false } = {}) {
  return { method: 'GET', url, mode, headers: new Headers(authorization ? { Authorization: 'Bearer fake-test-only' } : {}) }
}

test('service worker returns cached shell and public assets on an offline reload', async () => {
  const worker = await workerHarness()
  await worker.dispatch('install')
  worker.setOffline()
  const page = await worker.dispatch('fetch', request(`${worker.origin}/`, { mode: 'navigate' }))
  assert.match(await page.text(), /offline library/)
  const asset = await worker.dispatch('fetch', request(`${worker.origin}/assets/app.js`))
  assert.equal(await asset.text(), 'public asset')
})

test('service worker never intercepts TMDB API calls or authenticated requests', async () => {
  const worker = await workerHarness()
  assert.equal(await worker.dispatch('fetch', request('https://api.themoviedb.org/3/discover/movie')), null)
  assert.equal(await worker.dispatch('fetch', request(`${worker.origin}/api/movie`, { authorization: true })), null)
  assert.equal(await worker.dispatch('fetch', request('https://other.example/image.jpg')), null)
  assert.equal(worker.fetches(), 0)
  assert.equal(worker.stores.size, 0)
})

test('poster cache works offline and bounds its size to 96 images', async () => {
  const worker = await workerHarness()
  const image = request('https://image.tmdb.org/t/p/w500/test.jpg')
  await worker.dispatch('fetch', image)
  worker.setOffline()
  assert.equal(await (await worker.dispatch('fetch', image)).text(), 'online data')
  assert.equal(worker.fetches(), 1)
  const online = await workerHarness()
  for (let i = 0; i < 100; i++) await online.dispatch('fetch', request(`https://image.tmdb.org/t/p/w500/${i}.jpg`))
  assert.equal((await (await online.caches.open('watchpick-posters-v1')).keys()).length, 96)
})

test('worker updates remove only outdated WatchPick shell caches', async () => {
  const worker = await workerHarness()
  await worker.caches.open('watchpick-shell-old')
  await worker.caches.open('watchpick-shell-test')
  await worker.caches.open('watchpick-posters-v1')
  await worker.caches.open('other-app-data')
  await worker.dispatch('activate')
  const names = await worker.caches.keys()
  assert.equal(names.includes('watchpick-shell-old'), false)
  assert.ok(names.includes('watchpick-shell-test'))
  assert.ok(names.includes('watchpick-posters-v1'))
  assert.ok(names.includes('other-app-data'))
})
