import { keyOf } from './library.js'

export const emptyAnnotation = { favorite: false, personalRating: null, note: '' }
export const originalLanguages = [
  ['en', 'English'], ['ja', 'Japanese'], ['ko', 'Korean'], ['es', 'Spanish'],
  ['fr', 'French'], ['hi', 'Hindi'], ['tl', 'Tagalog'], ['de', 'German'],
]

function validAnnotation(value) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    (value.favorite === undefined || typeof value.favorite === 'boolean') &&
    (value.personalRating == null || (Number.isInteger(value.personalRating) && value.personalRating >= 1 && value.personalRating <= 5)) &&
    (value.note === undefined || (typeof value.note === 'string' && value.note.length <= 1000)) &&
    (value.folder === undefined || (typeof value.folder === 'string' && value.folder.length <= 40)) &&
    (value.progress == null || (typeof value.progress === 'object' && Number.isInteger(value.progress.season) && value.progress.season >= 0 && value.progress.season <= 100 && Number.isInteger(value.progress.episode) && value.progress.episode >= 0 && value.progress.episode <= 1000))
}
export function parseAnnotations(value, strict = false) {
  if (value == null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) {
    if (strict) throw new Error('Invalid title notes in this backup. Your library has not changed.')
    return {}
  }
  const entries = []
  for (const [key, item] of Object.entries(value)) {
    if (!/^(tmdb|demo):(movie|tv):[1-9]\d*$/.test(key) || !validAnnotation(item)) {
      if (strict) throw new Error('Invalid title notes in this backup. Your library has not changed.')
      continue
    }
    entries.push([key, { favorite: item.favorite ?? false, personalRating: item.personalRating ?? null, note: item.note ?? '', ...(item.folder !== undefined ? { folder: item.folder } : {}), ...(item.progress !== undefined ? { progress: item.progress } : {}) }])
  }
  return Object.fromEntries(entries)
}
export function readAnnotations(storage) {
  try { return parseAnnotations(JSON.parse(storage.getItem('watchpick-title-notes-v1') || '{}')) }
  catch { return {} }
}
export function updateAnnotation(annotations, title, patch) {
  const key = keyOf(title)
  const next = { ...emptyAnnotation, ...annotations[key], ...patch }
  if (!validAnnotation(next)) return annotations
  return { ...annotations, [key]: next }
}
export function filterCollection(titles, annotations, { query = '', type = 'either', favorites = false, folder = 'all' } = {}) {
  const text = query.trim().toLocaleLowerCase()
  return titles.filter(title => {
    const meta = annotations[keyOf(title)] || emptyAnnotation
    const search = [title.title, ...title.genres, meta.note].join(' ').toLocaleLowerCase()
    return (type === 'either' || title.type === type) && (!favorites || meta.favorite) && (!text || search.includes(text)) && (folder === 'all' || (folder === 'unfiled' ? !meta.folder : meta.folder === folder))
  })
}
export function collectionStats(library, annotations) {
  const all = [...new Map([...library.saved, ...library.watched].map(t => [keyOf(t), t])).values()]
  return { total: all.length, saved: library.saved.length, watched: library.watched.length,
    favorites: all.filter(title => annotations[keyOf(title)]?.favorite).length,
    movies: all.filter(title => title.type === 'movie').length,
    series: all.filter(title => title.type === 'tv').length,
    progress: all.length ? Math.round(library.watched.length / all.length * 100) : 0 }
}
export function chooseSavedTitle(titles, previous, random = Math.random) {
  const choices = titles.length > 1 ? titles.filter(title => keyOf(title) !== keyOf(previous || {})) : titles
  return choices[Math.floor(random() * choices.length)] || null
}
export function tmdbTitleUrl(title) {
  if (!title || title.source !== 'tmdb' || !['movie', 'tv'].includes(title.type) || !Number.isInteger(title.id) || title.id < 1) return null
  return `https://www.themoviedb.org/${title.type}/${title.id}`
}
