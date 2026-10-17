import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bundledPreviews } from '../src/data/featured.js'
import { keyOf } from '../src/lib/library.js'
import { fetchPreviewPool, readPreviewKeys, rememberPreviews, selectPreviews } from '../src/lib/previews.js'

test('preview refresh avoids the previous four posters when alternatives exist', () => {
  const first = selectPreviews(bundledPreviews, [], 4, () => .25)
  const second = selectPreviews(bundledPreviews, first.map(keyOf), 4, () => .25)
  assert.equal(first.length, 4); assert.equal(second.length, 4)
  assert.ok(second.every(title => !first.map(keyOf).includes(keyOf(title))))
})
test('preview selection deduplicates, excludes missing posters and handles small pools', () => {
  const one = bundledPreviews[0]
  const titles = selectPreviews([one, one, { ...one, id: 2, poster: null }, { ...one, type: 'tv' }], [], 4)
  assert.equal(titles.length, 2)
  assert.notEqual(keyOf(titles[0]), keyOf(titles[1]))
  assert.deepEqual(selectPreviews([], []), [])
})
test('last displayed preview set survives reload and corrupt/restricted storage recovers', () => {
  let value
  const storage = { getItem: () => value, setItem: (_key, data) => { value = data } }
  rememberPreviews(storage, bundledPreviews.slice(0, 4))
  assert.deepEqual(readPreviewKeys(storage), bundledPreviews.slice(0, 4).map(keyOf))
  assert.ok(selectPreviews(bundledPreviews, readPreviewKeys(storage)).every(title => !readPreviewKeys(storage).includes(keyOf(title))))
  for (const bad of ['null', '{}', 'bad']) assert.deepEqual(readPreviewKeys({ getItem: () => bad }), [])
  assert.deepEqual(readPreviewKeys(null), [])
  assert.doesNotThrow(() => rememberPreviews(null, []))
})
test('featured pool uses random Discover pages for both media and rejects adult/missing-image records', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => {
    urls.push(new URL(url))
    return { ok: true, json: async () => ({ results: [{ id: 1, title: 'Film', name: 'Series', poster_path: '/poster.jpg' }, { id: 2, adult: true, poster_path: '/poster.jpg' }, { id: 3, poster_path: null }] }) }
  }
  try {
    const pool = await fetchPreviewPool(() => .99)
    assert.equal(pool.length, 2)
    assert.deepEqual(pool.map(t => t.type), ['movie', 'tv'])
    assert.ok(urls.every(url => url.searchParams.get('page') === '5' && url.searchParams.get('include_adult') === 'false'))
  } finally { globalThis.fetch = original }
})
