import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chooseHeroCover, heroCovers, selectPageCover } from '../src/lib/hero.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
}

test('every shuffled round shows all covers once and avoids repeats at round boundaries', () => {
  for (const random of [() => 0, () => .999, Math.random]) {
    const storage = memoryStorage()
    let previous
    for (let round = 0; round < 20; round++) {
      const seen = new Set()
      for (let i = 0; i < heroCovers.length; i++) {
        const cover = selectPageCover(storage, random)
        assert.notEqual(cover.id, previous)
        assert.ok(!seen.has(cover.id))
        seen.add(cover.id)
        previous = cover.id
        assert.equal(JSON.parse(storage.getItem('watchpick-hero-cycle-v1')).previousId, cover.id)
      }
      assert.equal(seen.size, heroCovers.length)
    }
  }
})

test('legacy previous cover is respected and malformed decks recover', () => {
  for (const data of ['bad JSON', 'null', '{"previousId":"inception","remaining":["unknown"]}', '{"previousId":"inception","remaining":["interstellar","interstellar"]}']) {
    const storage = memoryStorage()
    storage.setItem('watchpick-last-hero', 'inception')
    storage.setItem('watchpick-hero-cycle-v1', data)
    const cover = selectPageCover(storage, () => 0)
    assert.notEqual(cover.id, 'inception')
    assert.ok(heroCovers.includes(cover))
  }
})

test('every cover is selectable and references a bundled landscape JPEG', () => {
  assert.equal(chooseHeroCover('unknown', () => 0).id, heroCovers[0].id)
  assert.equal(chooseHeroCover(null, () => .999).id, heroCovers.at(-1).id)
  for (const cover of heroCovers) {
    assert.notEqual(chooseHeroCover(cover.id, () => 0).id, cover.id)
    const bytes = readFileSync(new URL(`../public${cover.image}`, import.meta.url))
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
    assert.ok(bytes.length > 10000)
  }
})

test('blocked storage does not prevent rendering a cover', () => {
  const storage = { getItem() { throw Error('denied') }, setItem() { throw Error('denied') } }
  assert.ok(heroCovers.includes(selectPageCover(storage)))
})
