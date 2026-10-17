import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { catalog, demoGenres } from './fixtures/catalog.mjs'
import { chooseCandidate, filterCatalog, keyOf, readLibrary, updateLibrary } from '../src/lib/library.js'
import { details, discover, genreIds, genreOptions, loadGenres, normalize, request } from '../src/lib/tmdb.js'

test('all media and genre filters match the sample catalog', () => {
  for (const type of ['movie', 'tv', 'either']) for (const genre of ['any', ...demoGenres]) {
    const matches = filterCatalog(catalog, type, genre)
    assert.ok(matches.every(t => (type === 'either' || t.type === type) && (genre === 'any' || t.genres.includes(genre))))
  }
  assert.equal(filterCatalog(catalog, 'either', 'any').length, 8)
  assert.equal(filterCatalog(catalog, 'movie', 'Comedy').length, 1)
  assert.equal(filterCatalog(catalog, 'tv', 'Animation').length, 0)
})
test('selection never repeats until eligible pool exhausted; restarts without immediate repeat', () => {
  const seen = new Set()
  let previous
  for (let i = 0; i < catalog.length; i++) {
    const pick = chooseCandidate(catalog, [], seen, previous, () => 0)
    assert.ok(pick.title)
    assert.equal(pick.restarted, false)
    assert.ok(!seen.has(keyOf(pick.title)))
    seen.add(keyOf(pick.title)); previous = pick.title
  }
  const next = chooseCandidate(catalog, [], seen, previous, () => 0)
  assert.equal(next.restarted, true)
  assert.notEqual(keyOf(next.title), keyOf(previous))
})
test('watched titles excluded, single candidate can repeat, all watched gives no result', () => {
  assert.equal(chooseCandidate(catalog, catalog, new Set(), null).title, null)
  const title = catalog[0]
  assert.equal(chooseCandidate([title], [], new Set([keyOf(title)]), title).title, title)
  assert.ok(!chooseCandidate(catalog, [title], new Set(), null, () => 0).title || chooseCandidate(catalog, [title], new Set(), null, () => 0).title !== title)
})
test('save, remove, watched, undo, and simulated reload preserve library correctly', () => {
  let library = { saved: [], watched: [] }
  const title = catalog[0]
  library = updateLibrary(library, 'toggleSave', title)
  assert.deepEqual(library.saved, [title])
  library = updateLibrary(library, 'toggleSave', title)
  assert.equal(library.saved.length, 0)
  library = updateLibrary(library, 'toggleSave', title)
  library = updateLibrary(library, 'watch', title)
  assert.equal(library.saved.length, 0)
  assert.deepEqual(library.watched, [title])
  const reloaded = readLibrary({ getItem: () => JSON.stringify(library) })
  assert.deepEqual(reloaded, library)
  assert.equal(chooseCandidate([title], reloaded.watched, new Set(), null).title, null)
  library = updateLibrary(reloaded, 'undo', title)
  assert.equal(chooseCandidate([title], library.watched, new Set(), null).title, title)
})
test('malformed, partial, denied, duplicate, or null localStorage is recovered safely', () => {
  for (const data of ['{broken', 'null', '42', '{"saved":{}}', '{"saved":[null,{},"bad"]}']) {
    assert.deepEqual(readLibrary({ getItem: () => data }), { saved: [], watched: [] })
  }
  assert.deepEqual(readLibrary({ getItem: () => { throw Error('denied') } }), { saved: [], watched: [] })
  const item = catalog[0]
  assert.equal(readLibrary({ getItem: () => JSON.stringify({ saved: [item, item] }) }).saved.length, 1)
})
test('identity distinguishes movie, TV, and demo records with overlapping IDs', () => {
  assert.notEqual(keyOf(catalog[0]), keyOf(catalog[1]))
  assert.notEqual(keyOf(catalog[0]), keyOf({ ...catalog[0], source: 'tmdb' }))
})
const lists = { movie: [{ id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }], tv: [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 10759, name: 'Action & Adventure' }] }
test('shared genre selection maps to separately fetched movie and TV IDs', () => {
  assert.deepEqual(genreIds(lists.movie, 'Science Fiction'), [878])
  assert.deepEqual(genreIds(lists.tv, 'Science Fiction'), [10765])
  assert.deepEqual(genreOptions(lists, 'either'), ['Adventure', 'Science Fiction'])
})
test('movie and TV fields normalize with safe missing-data fallbacks', () => {
  const tv = normalize({ id: 1, name: 'Series', first_air_date: '2024-01-01', genre_ids: [10765] }, 'tv', lists)
  assert.equal(tv.title, 'Series'); assert.equal(tv.year, '2024'); assert.equal(tv.poster, null); assert.equal(tv.rating, null)
  assert.deepEqual(tv.genres, ['Sci-Fi & Fantasy'])
  const movie = normalize({ id: 2, title: 'Film', release_date: '2020-03-01', vote_count: 12, vote_average: 8.4, runtime: 120 }, 'movie', lists)
  assert.equal(movie.rating, 8.4); assert.equal(movie.duration, '120 min')
  assert.equal(normalize({ id: 3 }, 'movie', lists).title, 'Untitled')
})
test('TMDB adapter loads both genre lists, disables adults and uses details endpoints', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => {
    urls.push(new URL(url))
    const path = new URL(url).pathname
    const data = path.includes('/genre/') ? { genres: path.includes('/movie/') ? lists.movie : lists.tv } : path.includes('/discover/') ? { results: [{ id: 1, title: 'Movie', name: 'TV', adult: false }, { id: 2, adult: true }] } : { id: 1, title: 'Full title', adult: false }
    return { ok: true, json: async () => data }
  }
  try {
    assert.deepEqual(await loadGenres(), lists)
    const pool = await discover('either', 'Science Fiction', lists)
    assert.equal(pool.length, 2)
    const requests = urls.filter(url => url.pathname.includes('/discover/'))
    assert.equal(requests[0].searchParams.get('with_genres'), '878')
    assert.equal(requests[1].searchParams.get('with_genres'), '10765')
    assert.ok(requests.every(url => url.searchParams.get('include_adult') === 'false'))
    assert.equal((await details(pool[0], lists)).title, 'Full title')
    globalThis.fetch = async () => ({ ok: false, status: 401 })
    await assert.rejects(request('movie/1'), /authorize/)
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ adult: true }) })
    await assert.rejects(details(pool[0], lists), /unavailable/)
  } finally { globalThis.fetch = original }
})

// Verify deployed sample images are bundled JPEGs, not the old mock posters.
test('every real sample has a local JPEG poster and the hero has a real still', () => {
  for (const title of catalog) {
    assert.match(title.poster, /^\/posters\/[a-z-]+\.jpg$/)
    const bytes = readFileSync(new URL(`../public${title.poster}`, import.meta.url))
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
    assert.ok(bytes.length > 10000)
  }
  const backdrop = readFileSync(new URL('../public/posters/interstellar-backdrop.jpg', import.meta.url))
  assert.equal(backdrop[0], 0xff)
  assert.equal(catalog.find(t => t.title === 'Interstellar').id, 157336)
  assert.equal(catalog.find(t => t.title === 'Spirited Away').id, 129)
})
