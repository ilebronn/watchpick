import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalog } from './fixtures/catalog.mjs'
import { keyOf, updateLibrary } from '../src/lib/library.js'
import { cleanWorkspace, defaultWorkspace, drawCandidates, emptyGroup, mergeWorkspace, readWorkspace, resolveGroup, restoreTitleMembership, validDate } from '../src/lib/experience.js'
import { filterCollection, parseAnnotations, updateAnnotation } from '../src/lib/collection.js'
import { discover } from '../src/lib/tmdb.js'
import { defaultPreferences } from '../src/lib/features.js'

const group = (members) => ({ enabled: true, members })
test('group picks intersect every viewer’s acceptable genres and media types', () => {
  const people = group([{ name: 'A', type: 'either', genres: ['Drama', 'Comedy'] }, { name: 'B', type: 'movie', genres: ['Comedy', 'Mystery'] }])
  assert.deepEqual(resolveGroup(people, 'either', 'any'), { type: 'movie', genres: ['Comedy'] })
  assert.deepEqual(resolveGroup(emptyGroup, 'tv', 'Drama'), { type: 'tv', genres: [] })
  assert.deepEqual(resolveGroup(group([{ type: 'either', genres: [] }, { type: 'tv', genres: [] }]), 'either', 'any'), { type: 'tv', genres: [] })
})
test('group conflicts are explicit rather than silently ignored', () => {
  assert.throws(() => resolveGroup(group([{ type: 'movie', genres: [] }, { type: 'tv', genres: [] }]), 'either', 'any'), /disagrees/)
  assert.throws(() => resolveGroup(group([{ type: 'either', genres: ['Comedy'] }, { type: 'either', genres: ['Crime'] }]), 'either', 'any'), /No genre/)
  assert.throws(() => resolveGroup(group([{ type: 'either', genres: ['Comedy'] }, { type: 'either', genres: [] }]), 'movie', 'Drama'), /No genre/)
})
test('three-choice rounds are distinct, consume unseen candidates, and respect exclusions', () => {
  let seen = new Set()
  const excluded = [catalog[0], catalog[1]]
  const first = drawCandidates(catalog, excluded, seen, null, 3, () => 0)
  assert.equal(first.titles.length, 3)
  assert.equal(new Set(first.titles.map(keyOf)).size, 3)
  assert.ok(first.titles.every(t => !excluded.includes(t)))
  seen = first.nextSeen
  const second = drawCandidates(catalog, excluded, seen, null, 3, () => 0)
  assert.ok(second.titles.every(t => !seen.has(keyOf(t))))
  const restarted = drawCandidates(catalog, excluded, second.nextSeen, second.titles.at(-1), 3, () => 0)
  assert.equal(restarted.restarted, true)
  assert.notEqual(keyOf(restarted.titles[0]), keyOf(second.titles.at(-1)))
})
test('small pools return only remaining choices and hidden-only pools return none', () => {
  assert.equal(drawCandidates(catalog.slice(0, 2), [], new Set(), null, 3).titles.length, 2)
  assert.equal(drawCandidates(catalog.slice(0, 2), [], new Set([keyOf(catalog[0])]), null, 3).titles.length, 1)
  assert.equal(drawCandidates(catalog, catalog, new Set(), null, 3).titles.length, 0)
})
test('folder assignment filters saved titles and supports unfiled entries', () => {
  const metadata = updateAnnotation({}, catalog[0], { folder: 'Weekend' })
  assert.deepEqual(filterCollection(catalog, metadata, { folder: 'Weekend' }), [catalog[0]])
  assert.equal(filterCollection(catalog, metadata, { folder: 'unfiled' }).length, 7)
  assert.equal(filterCollection(catalog, metadata, { folder: 'all' }).length, 8)
})
test('series season and episode progress validates and persists through backup round trips', () => {
  const metadata = updateAnnotation({}, catalog[1], { progress: { season: 2, episode: 5 }, folder: 'Together' })
  assert.deepEqual(parseAnnotations(JSON.parse(JSON.stringify(metadata)), true), metadata)
  assert.equal(updateAnnotation(metadata, catalog[1], { progress: { season: -1, episode: 2 } }), metadata)
  assert.equal(updateAnnotation(metadata, catalog[1], { progress: { season: 1, episode: 1001 } }), metadata)
  assert.equal(updateAnnotation(metadata, catalog[1], { progress: null })[keyOf(catalog[1])].progress, null)
})
test('planner dates reject impossible dates and workspace backups preserve plans and exclusions', () => {
  assert.ok(validDate('2028-02-29'))
  for (const date of ['2027-02-29', '2026-13-01', 'tomorrow', '2026-2-1']) assert.equal(validDate(date), false)
  const value = { ...defaultWorkspace, hidden: [catalog[0]], folders: ['Weekend'], plans: [{ id: 'night-1', title: catalog[1], date: '2026-12-01' }], spoilerFree: true }
  assert.deepEqual(readWorkspace({ getItem: () => JSON.stringify(value) }), value)
  assert.deepEqual(cleanWorkspace(undefined, true), defaultWorkspace)
  assert.throws(() => cleanWorkspace({ plans: [{ id: 'x', title: catalog[0], date: 'bad' }] }, true), /Invalid planner/)
})
test('workspace import merges unique plans, preserves local conflicts, and restores spoiler preference', () => {
  const before = { ...defaultWorkspace, folders: ['Weekend'], plans: [{ id: 'night-1', title: catalog[0], date: '2026-12-01' }] }
  const result = mergeWorkspace(before, { ...defaultWorkspace, folders: ['weekend', 'Friends'], plans: [{ id: 'night-1', title: catalog[0], date: '2026-12-02' }], hidden: [catalog[2]], spoilerFree: true })
  assert.equal(result.plans.length, 1); assert.equal(result.plans[0].date, '2026-12-01')
  assert.equal(result.folders.length, 2); assert.equal(result.spoilerFree, true)
  assert.equal(result.hidden.length, 1)
})
test('undo restores saved/watched membership and order without reverting unrelated later edits', () => {
  const before = { saved: [catalog[0], catalog[1]], watched: [] }
  let after = updateLibrary(before, 'watch', catalog[0])
  after = updateLibrary(after, 'toggleSave', catalog[2])
  const restored = restoreTitleMembership(after, catalog[0], before)
  assert.deepEqual(restored.saved, [catalog[0], catalog[1], catalog[2]])
  assert.deepEqual(restored.watched, [])
  const removed = updateLibrary(before, 'toggleSave', catalog[0])
  assert.deepEqual(restoreTitleMembership(removed, catalog[0], before), before)
})
test('multi-page discovery respects its cap, removes duplicates, and uses OR for shared genres', async () => {
  const original = globalThis.fetch
  const urls = []
  globalThis.fetch = async url => {
    const parsed = new URL(url); urls.push(parsed)
    const page = Number(parsed.searchParams.get('page'))
    return { ok: true, json: async () => ({ total_pages: 20, results: [{ id: page, title: `Title ${page}` }, { id: 1, title: 'Repeated title' }] }) }
  }
  try {
    const lists = { movie: [{ id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' }], tv: [] }
    const titles = await discover('movie', 'any', lists, { ...defaultPreferences, candidatePages: 3 }, ['Comedy', 'Drama'])
    assert.equal(urls.length, 3); assert.equal(titles.length, 3)
    assert.equal(urls[0].searchParams.get('with_genres'), '35|18')
    urls.length = 0
    await discover('movie', 'any', lists, { ...defaultPreferences, candidatePages: 100 })
    assert.equal(urls.length, 5)
  } finally { globalThis.fetch = original }
})
