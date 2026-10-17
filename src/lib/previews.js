import { keyOf } from './library.js'
import { normalize, request } from './tmdb.js'

export function selectPreviews(pool, previousKeys = [], count = 4, random = Math.random) {
  const unique = [...new Map(pool.filter(title => title.poster).map(title => [keyOf(title), title])).values()]
  const fresh = unique.filter(title => !previousKeys.includes(keyOf(title)))
  const remaining = unique.filter(title => previousKeys.includes(keyOf(title)))
  function shuffle(items) {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const index = Math.floor(random() * (i + 1))
      ;[copy[i], copy[index]] = [copy[index], copy[i]]
    }
    return copy
  }
  return [...shuffle(fresh), ...shuffle(remaining)].slice(0, count)
}
export function readPreviewKeys(storage) {
  try {
    const keys = JSON.parse(storage.getItem('watchpick-featured-posters-v1') || '[]')
    return Array.isArray(keys) ? keys.filter(key => typeof key === 'string').slice(0, 4) : []
  } catch { return [] }
}
export function rememberPreviews(storage, titles) {
  try { storage.setItem('watchpick-featured-posters-v1', JSON.stringify(titles.map(keyOf))) }
  catch { /* Editorial previews still work with restricted session storage. */ }
}
export async function fetchPreviewPool(random = Math.random) {
  const page = String(1 + Math.floor(random() * 5))
  const emptyGenres = { movie: [], tv: [] }
  const sets = await Promise.all(['movie', 'tv'].map(async type => {
    const data = await request(`discover/${type}`, { include_adult: 'false', include_video: 'false', sort_by: 'popularity.desc', page })
    return data.results.filter(title => !title.adult && title.poster_path).map(title => normalize(title, type, emptyGenres))
  }))
  return sets.flat()
}
