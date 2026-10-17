import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalog } from './fixtures/catalog.mjs'
import { keyOf } from '../src/lib/library.js'
import { chooseSavedTitle, collectionStats, filterCollection, parseAnnotations, readAnnotations, tmdbTitleUrl, updateAnnotation } from '../src/lib/collection.js'
import { discover, normalize } from '../src/lib/tmdb.js'
import { defaultPreferences } from '../src/lib/features.js'

const title = { ...catalog[0], source: 'tmdb' }

test('favorite toggles, personal rating and notes remain independent and immutable', () => {
  const before = {}
  let annotations = updateAnnotation(before, title, { favorite: true })
  annotations = updateAnnotation(annotations, title, { personalRating: 4, note: 'Watch with friends' })
  assert.deepEqual(annotations[keyOf(title)], { favorite: true, personalRating: 4, note: 'Watch with friends' })
  annotations = updateAnnotation(annotations, title, { favorite: false })
  assert.equal(annotations[keyOf(title)].personalRating, 4)
  assert.equal(annotations[keyOf(title)].note, 'Watch with friends')
  assert.deepEqual(before, {})
  assert.equal(updateAnnotation(annotations, title, { personalRating: 6 }), annotations)
})

test('personal ratings can be cleared, allow 1–5, and reject fractional or out-of-range values', () => {
  for (const value of [1, 2, 3, 4, 5, null]) {
    assert.equal(updateAnnotation({}, title, { personalRating: value })[keyOf(title)].personalRating, value)
  }
  for (const value of [0, 6, 1.5, '5']) assert.deepEqual(updateAnnotation({}, title, { personalRating: value }), {})
})

test('annotation persistence survives reload, and malformed or inaccessible storage recovers', () => {
  const annotations = updateAnnotation({}, title, { favorite: true, note: 'A good night in', personalRating: 5 })
  assert.deepEqual(readAnnotations({ getItem: () => JSON.stringify(annotations) }), annotations)
  for (const text of ['bad JSON', '[]', '42', 'null']) assert.deepEqual(readAnnotations({ getItem: () => text }), {})
  assert.deepEqual(readAnnotations({ getItem() { throw Error('denied') } }), {})
})

test('library search finds titles, genres and private notes with case-insensitive matching', () => {
  const annotations = updateAnnotation({}, catalog[0], { note: 'Watch with SAM' })
  assert.equal(filterCollection(catalog, annotations, { query: ' sam ' })[0].title, 'Interstellar')
  assert.equal(filterCollection(catalog, annotations, { query: 'spirited' })[0].id, 129)
  assert.ok(filterCollection(catalog, annotations, { query: 'mystery' }).every(t => t.genres.includes('Mystery')))
  assert.equal(filterCollection(catalog, annotations, { query: 'no such title' }).length, 0)
})

test('media and favorite-only filters compose without modifying the saved array', () => {
  let annotations = updateAnnotation({}, catalog[0], { favorite: true })
  annotations = updateAnnotation(annotations, catalog[1], { favorite: true })
  assert.equal(filterCollection(catalog, annotations, { type: 'movie', favorites: true }).length, 1)
  assert.equal(filterCollection(catalog, annotations, { type: 'tv', favorites: true })[0].id, 66732)
  assert.equal(filterCollection(catalog, {}, { favorites: true }).length, 0)
  assert.equal(catalog.length, 8)
})

test('pick from watchlist handles empty/single pools and avoids immediate repeats', () => {
  assert.equal(chooseSavedTitle([], null), null)
  assert.equal(chooseSavedTitle([catalog[0]], catalog[0]), catalog[0])
  assert.equal(chooseSavedTitle(catalog.slice(0, 2), catalog[0], () => 0), catalog[1])
})

test('library statistics handle empty collections and count media, favorites and watched progress', () => {
  const empty = collectionStats({ saved: [], watched: [] }, {})
  assert.equal(empty.progress, 0); assert.equal(empty.total, 0)
  const stats = collectionStats({ saved: [catalog[0], catalog[1]], watched: [catalog[2], catalog[3]] }, updateAnnotation({}, catalog[0], { favorite: true }))
  assert.deepEqual(stats, { total: 4, saved: 2, watched: 2, favorites: 1, movies: 2, series: 2, progress: 50 })
})

test('annotation backup format is backward compatible and rejects corrupt entries before import', () => {
  assert.deepEqual(parseAnnotations(undefined, true), {})
  const notes = updateAnnotation({}, title, { note: 'Keep me', favorite: true })
  assert.deepEqual(parseAnnotations(JSON.parse(JSON.stringify(notes)), true), notes)
  for (const bad of [[], 12, { '__bad': {} }, { [keyOf(title)]: { note: 'a'.repeat(1001) } }, { [keyOf(title)]: { favorite: 'yes' } }]) {
    assert.throws(() => parseAnnotations(bad, true), /Invalid title notes/)
  }
  const mixed = { ...notes, broken: { note: 'ignore' } }
  assert.deepEqual(parseAnnotations(mixed), notes)
})

test('share links identify only valid real movie or TV titles and never include credentials', () => {
  assert.equal(tmdbTitleUrl(title), 'https://www.themoviedb.org/movie/157336')
  assert.equal(tmdbTitleUrl({ ...catalog[1], source: 'tmdb' }), 'https://www.themoviedb.org/tv/66732')
  assert.equal(tmdbTitleUrl(catalog[0]), null)
  assert.equal(tmdbTitleUrl({ ...title, id: -1 }), null)
  assert.equal(tmdbTitleUrl({ ...title, type: 'person' }), null)
})

test('original-language preference is applied separately to both movie and TV Discover', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => { urls.push(new URL(url)); return { ok: true, json: async () => ({ results: [] }) } }
  try {
    const lists = { movie: [], tv: [] }
    await discover('either', 'any', lists, { ...defaultPreferences, language: 'ko' })
    assert.equal(urls.length, 2)
    assert.ok(urls.every(url => url.searchParams.get('with_original_language') === 'ko'))
    urls.length = 0
    await discover('movie', 'any', lists)
    assert.equal(urls[0].searchParams.has('with_original_language'), false)
    assert.equal(normalize({ id: 1, original_language: 'ja' }, 'movie', lists).originalLanguage, 'ja')
  } finally { globalThis.fetch = original }
})
