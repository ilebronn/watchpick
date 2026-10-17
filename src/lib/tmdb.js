import { defaultPreferences, eraRanges, runtimeRanges } from './features.js'
const token = import.meta.env?.VITE_TMDB_READ_TOKEN?.trim()
export const hasLiveConfig = Boolean(token && !token.startsWith('your_'))
const base = 'https://api.themoviedb.org/3'
export async function request(path, params = {}, signal) {
  const url = new URL(`${base}/${path}`)
  url.search = new URLSearchParams({ language: 'en-US', ...params })
  const timeout = AbortSignal.timeout(15000)
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' }, signal: requestSignal })
  if (!response.ok) throw new Error(response.status === 401 ? 'TMDB could not authorize this configuration. Check your API Read Access Token.' : response.status === 429 ? 'TMDB is busy. Please wait a moment and try again.' : `TMDB is unavailable (HTTP ${response.status}). Please try again.`)
  return response.json()
}
export async function loadGenres() {
  const [movie, tv] = await Promise.all(['movie', 'tv'].map(type => request(`genre/${type}/list`)))
  return { movie: movie.genres, tv: tv.genres }
}
// Shared categories use names from each separately fetched TMDB genre list.
const aliases = { Adventure: ['Adventure', 'Action & Adventure'], Action: ['Action', 'Action & Adventure'], 'Science Fiction': ['Science Fiction', 'Sci-Fi & Fantasy'], Fantasy: ['Fantasy', 'Sci-Fi & Fantasy'] }
export function genreIds(genres, selection) {
  return genres.filter(g => (aliases[selection] || [selection]).includes(g.name)).map(g => g.id)
}
export function genreOptions(lists, type) {
  const all = (type === 'either' ? [...lists.movie, ...lists.tv] : lists[type]).map(g => g.name)
  return [...new Set(all.map(name => name === 'Action & Adventure' ? 'Adventure' : name === 'Sci-Fi & Fantasy' ? 'Science Fiction' : name))].sort()
}
export function normalize(raw, type, lists) {
  const date = raw.release_date || raw.first_air_date
  return { id: raw.id, type, source: 'tmdb', originalLanguage: raw.original_language || null, title: raw.title || raw.name || 'Untitled', year: date?.slice(0, 4) || 'Year unavailable', overview: raw.overview || 'No overview is available for this title.', tagline: raw.tagline || '', genres: raw.genres?.map(g => g.name) || (raw.genre_ids || []).map(id => lists[type].find(g => g.id === id)?.name).filter(Boolean), rating: raw.vote_count > 0 && Number.isFinite(raw.vote_average) ? raw.vote_average : null, poster: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null, duration: type === 'movie' ? (raw.runtime ? `${raw.runtime} min` : '') : (raw.number_of_seasons ? `${raw.number_of_seasons} season${raw.number_of_seasons === 1 ? '' : 's'}` : '') }
}
export async function discover(type, genre, lists, preferences = defaultPreferences, groupGenres = []) {
  const types = type === 'either' ? ['movie', 'tv'] : [type]
  const pools = await Promise.all(types.map(async media => {
    const required = groupGenres.length ? groupGenres : genre === 'any' ? [] : [genre]
    const ids = [...new Set(required.flatMap(name => genreIds(lists[media], name)))]
    if (required.length && !ids.length) return []
    const extra = {}
    if (preferences.language && preferences.language !== 'any') extra.with_original_language = preferences.language
    const years = eraRanges[preferences.era]
    if (years) {
      const field = media === 'movie' ? 'primary_release_date' : 'first_air_date'
      if (years[0]) extra[`${field}.gte`] = `${years[0]}-01-01`
      extra[`${field}.lte`] = `${years[1]}-12-31`
    }
    if (Number(preferences.minRating) > 0) {
      extra['vote_average.gte'] = preferences.minRating
      extra['vote_count.gte'] = '50'
    }
    const runtime = runtimeRanges[preferences.runtime]
    if (media === 'movie' && runtime) {
      extra['with_runtime.gte'] = String(runtime[0])
      extra['with_runtime.lte'] = String(runtime[1])
    }
    const pool = []
    const maxPages = Math.min(5, Math.max(1, Number(preferences.candidatePages) || 1))
    for (let page = 1; page <= maxPages; page++) {
      const data = await request(`discover/${media}`, { ...extra, include_adult: 'false', include_video: 'false', sort_by: 'popularity.desc', page: String(page), ...(ids.length ? { with_genres: ids.join('|') } : {}) })
      pool.push(...data.results.filter(t => !t.adult).map(t => normalize(t, media, lists)))
      if (page >= (data.total_pages || 1) || !data.results.length) break
    }
    return [...new Map(pool.map(title => [title.id, title])).values()]
  }))
  return pools.flat()
}
export async function details(title, lists, signal) {
  const data = await request(`${title.type}/${title.id}`, {}, signal)
  if (data.adult) throw new Error('This title is unavailable. Please pick again.')
  return normalize(data, title.type, lists)
}

export async function searchTitles(query, type, lists, signal) {
  const types = type === 'either' ? ['movie', 'tv'] : [type]
  const pools = await Promise.all(types.map(async media => {
    const data = await request(`search/${media}`, { query, include_adult: 'false', page: '1' }, signal)
    return data.results.filter(item => !item.adult).map(item => normalize(item, media, lists))
  }))
  return pools.flat()
}
