export const keyOf = (title) => `${title.source || 'tmdb'}:${title.type}:${title.id}`
export function validTitle(item) {
  return item && ['movie', 'tv'].includes(item.type) && Number.isInteger(item.id) && item.id > 0 && typeof item.title === 'string' && Array.isArray(item.genres) && item.genres.every(g => typeof g === 'string') && ['demo', 'tmdb'].includes(item.source) && typeof item.year === 'string' && typeof item.overview === 'string' && (item.poster == null || typeof item.poster === 'string') && (item.duration == null || typeof item.duration === 'string') && (item.tagline == null || typeof item.tagline === 'string') && (item.rating == null || (Number.isFinite(item.rating) && item.rating >= 0 && item.rating <= 10))
}
export function readLibrary(storage) {
  try {
    const parsed = JSON.parse(storage.getItem('watchpick-library-v1') || '{}')
    const clean = value => Array.isArray(value) ? [...new Map(value.filter(validTitle).map(t => [keyOf(t), t])).values()] : []
    const watched = clean(parsed.watched)
    return { saved: clean(parsed.saved).filter(t => !watched.some(w => keyOf(w) === keyOf(t))), watched }
  } catch { return { saved: [], watched: [] } }
}
export function chooseCandidate(pool, watched, seen, previous, random = Math.random) {
  const eligible = pool.filter(t => !watched.some(w => keyOf(w) === keyOf(t)))
  let available = eligible.filter(t => !seen.has(keyOf(t)))
  const restarted = eligible.length > 0 && available.length === 0
  if (restarted) available = eligible.length > 1 ? eligible.filter(t => keyOf(t) !== keyOf(previous || {})) : eligible
  return { title: available[Math.floor(random() * available.length)] || null, restarted }
}
export function updateLibrary(library, action, title) {
  const same = t => keyOf(t) === keyOf(title)
  if (action === 'toggleSave') return { ...library, saved: library.saved.some(same) ? library.saved.filter(t => !same(t)) : [...library.saved, title] }
  if (action === 'watch') return { saved: library.saved.filter(t => !same(t)), watched: [...library.watched.filter(t => !same(t)), title] }
  if (action === 'undo') return { ...library, watched: library.watched.filter(t => !same(t)) }
  return library
}
export function filterCatalog(catalog, type, genre) {
  return catalog.filter(t => (type === 'either' || t.type === type) && (genre === 'any' || t.genres.includes(genre)))
}
