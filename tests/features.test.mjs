import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalog } from './fixtures/catalog.mjs'
import { keyOf } from '../src/lib/library.js'
import { defaultPreferences, matchesPreferences, mergeLibrary, moods, readPickHistory, rememberPick, sortWatchlist, surpriseMedia } from '../src/lib/features.js'
import { discover, searchTitles } from '../src/lib/tmdb.js'

test('year eras filter real movies and TV premieres; missing years are excluded only when filtering', () => {
  const prefs = { ...defaultPreferences, era: '2010s' }
  assert.ok(matchesPreferences(catalog[0], prefs))
  assert.equal(matchesPreferences(catalog[4], prefs), false)
  assert.ok(matchesPreferences(catalog[5], { ...prefs, era: '2020s' }))
  assert.equal(matchesPreferences({ ...catalog[0], year: 'Unavailable' }, prefs), false)
  assert.ok(matchesPreferences({ ...catalog[0], year: 'Unavailable' }, defaultPreferences))
})

test('movie runtime boundaries are inclusive and series remain unaffected', () => {
  const movie = catalog[0]
  assert.ok(matchesPreferences({ ...movie, duration: '100 min' }, { ...defaultPreferences, runtime: 'short' }))
  assert.equal(matchesPreferences({ ...movie, duration: '101 min' }, { ...defaultPreferences, runtime: 'short' }), false)
  assert.ok(matchesPreferences({ ...movie, duration: '140 min' }, { ...defaultPreferences, runtime: 'standard' }))
  assert.ok(matchesPreferences(movie, { ...defaultPreferences, runtime: 'epic' }))
  assert.equal(matchesPreferences({ ...movie, duration: '' }, { ...defaultPreferences, runtime: 'short' }), false)
  assert.ok(matchesPreferences(catalog[1], { ...defaultPreferences, runtime: 'short' }))
})

test('rating preferences exclude unavailable and below-threshold ratings without fabricating sample scores', () => {
  const prefs = { ...defaultPreferences, minRating: '7' }
  assert.equal(matchesPreferences(catalog[0], prefs), false)
  assert.equal(matchesPreferences({ ...catalog[0], rating: 6.9 }, prefs), false)
  assert.ok(matchesPreferences({ ...catalog[0], rating: 7 }, prefs))
})

test('moods map to actual sample genres and surprise supports both media types', () => {
  for (const mood of moods) assert.ok(catalog.some(title => title.genres.includes(mood.genre)))
  assert.equal(surpriseMedia(() => 0), 'movie')
  assert.equal(surpriseMedia(() => .999), 'tv')
})

test('watchlist sorts alphabetically, by year, by rating, and reverse save order without mutation', () => {
  const items = [{ ...catalog[0], rating: 8 }, { ...catalog[2], rating: null }, { ...catalog[4], rating: 9 }]
  const original = [...items]
  assert.equal(sortWatchlist(items, 'rating')[0].rating, 9)
  assert.equal(sortWatchlist(items, 'rating').at(-1).rating, null)
  assert.equal(sortWatchlist(items, 'title')[0].title, 'Interstellar')
  assert.equal(sortWatchlist(items, 'year').at(-1).year, '2001')
  assert.equal(sortWatchlist(items, 'recent')[0], items.at(-1))
  assert.deepEqual(items, original)
})

test('export/import round trip merges duplicates and watched records take precedence', () => {
  const existing = { saved: [catalog[0], catalog[1]], watched: [catalog[2]] }
  const exported = JSON.parse(JSON.stringify({ app: 'WatchPick', version: 1, ...existing }))
  assert.deepEqual(mergeLibrary({ saved: [], watched: [] }, exported), existing)
  const merged = mergeLibrary(existing, { version: 1, saved: [catalog[0], catalog[2], catalog[3]], watched: [catalog[1], catalog[2]] })
  assert.deepEqual(merged.saved.map(keyOf), [catalog[0], catalog[3]].map(keyOf))
  assert.deepEqual(merged.watched.map(keyOf), [catalog[2], catalog[1]].map(keyOf))
  assert.equal(existing.saved.length, 2)
})

test('invalid library backups are rejected without modifying existing data', () => {
  const existing = { saved: [catalog[0]], watched: [] }
  for (const data of [null, {}, { version: 2, saved: [], watched: [] }, { version: 1, saved: [null], watched: [] }, { version: 1, saved: {}, watched: [] }]) {
    assert.throws(() => mergeLibrary(existing, data), /valid WatchPick/)
  }
  assert.deepEqual(existing, { saved: [catalog[0]], watched: [] })
})

test('pick history deduplicates, caps at 12, and survives a simulated reload', () => {
  let history = []
  for (let i = 1; i <= 15; i++) history = rememberPick(history, { ...catalog[0], id: i })
  assert.equal(history.length, 12)
  assert.equal(history[0].id, 15)
  history = rememberPick(history, { ...catalog[0], id: 10 })
  assert.equal(history[0].id, 10)
  assert.equal(history.length, 12)
  assert.deepEqual(readPickHistory({ getItem: () => JSON.stringify(history) }), history)
  for (const text of ['null', '{}', '[null, {}]', 'bad json']) assert.deepEqual(readPickHistory({ getItem: () => text }), [])
  assert.deepEqual(readPickHistory({ getItem() { throw Error('denied') } }), [])
})

const lists = { movie: [{ id: 35, name: 'Comedy' }], tv: [{ id: 35, name: 'Comedy' }] }
test('live Discover sends year, rating and movie-only runtime parameters', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => { urls.push(new URL(url)); return { ok: true, json: async () => ({ results: [] }) } }
  try {
    await discover('either', 'Comedy', lists, { era: '2010s', minRating: '7', runtime: 'short' })
    const movie = urls.find(url => url.pathname.endsWith('/movie')).searchParams
    const tv = urls.find(url => url.pathname.endsWith('/tv')).searchParams
    assert.equal(movie.get('primary_release_date.gte'), '2010-01-01')
    assert.equal(movie.get('primary_release_date.lte'), '2019-12-31')
    assert.equal(tv.get('first_air_date.gte'), '2010-01-01')
    assert.equal(tv.get('first_air_date.lte'), '2019-12-31')
    assert.equal(movie.get('vote_average.gte'), '7')
    assert.equal(tv.get('vote_count.gte'), '50')
    assert.equal(movie.get('with_runtime.lte'), '100')
    assert.equal(tv.has('with_runtime.lte'), false)
    assert.ok(urls.every(url => url.searchParams.get('include_adult') === 'false'))
  } finally { globalThis.fetch = original }
})

test('live search uses separate media endpoints, normalizes fields, and rejects adult candidates', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async (url, options) => {
    urls.push(new URL(url))
    assert.ok(options.signal)
    return { ok: true, json: async () => ({ results: [{ id: 1, title: 'Film', name: 'Series', release_date: '2014-01-01', first_air_date: '2016-01-01' }, { id: 2, adult: true }] }) }
  }
  try {
    const results = await searchTitles('a & b', 'either', lists, new AbortController().signal)
    assert.equal(results.length, 2)
    assert.deepEqual(results.map(t => t.type), ['movie', 'tv'])
    assert.ok(urls.every(url => url.pathname.includes('/search/') && url.searchParams.get('query') === 'a & b' && url.searchParams.get('include_adult') === 'false'))
  } finally { globalThis.fetch = original }
})
