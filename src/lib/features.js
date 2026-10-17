import { keyOf, validTitle } from './library.js'

export const defaultPreferences = { era: 'any', minRating: '0', runtime: 'any', language: 'any', candidatePages: 3 }
export const moods = [
  { label: 'Make me laugh', genre: 'Comedy' },
  { label: 'Keep me guessing', genre: 'Mystery' },
  { label: 'Take me somewhere', genre: 'Adventure' },
  { label: 'Something gripping', genre: 'Thriller' },
]
export const eraRanges = { '2020s': [2020, 2029], '2010s': [2010, 2019], '2000s': [2000, 2009], classics: [0, 1999] }
export const runtimeRanges = { short: [1, 100], standard: [101, 140], epic: [141, 1000] }

export function matchesPreferences(title, prefs = defaultPreferences) {
  const years = eraRanges[prefs.era]
  if (years && (!/^\d{4}$/.test(title.year) || Number(title.year) < years[0] || Number(title.year) > years[1])) return false
  if (Number(prefs.minRating) > 0 && (title.rating == null || title.rating < Number(prefs.minRating))) return false
  const runtime = runtimeRanges[prefs.runtime]
  if (runtime && title.type === 'movie') {
    const minutes = Number.parseInt(title.duration, 10)
    if (!minutes || minutes < runtime[0] || minutes > runtime[1]) return false
  }
  return true
}

export function sortWatchlist(titles, order) {
  const copy = [...titles]
  if (order === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title))
  if (order === 'year') return copy.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))
  if (order === 'rating') return copy.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
  return copy.reverse()
}

export function mergeLibrary(current, file) {
  if (!file || file.version !== 1 || !Array.isArray(file.saved) || !Array.isArray(file.watched) ||
    [...file.saved, ...file.watched].some(title => !validTitle(title))) throw new Error('Choose a valid WatchPick library export. Your current library has not changed.')
  const unique = items => [...new Map(items.map(t => [keyOf(t), t])).values()]
  const watched = unique([...current.watched, ...file.watched])
  const excluded = new Set(watched.map(keyOf))
  return { saved: unique([...current.saved, ...file.saved]).filter(t => !excluded.has(keyOf(t))), watched }
}

export function readPickHistory(storage) {
  try {
    const data = JSON.parse(storage.getItem('watchpick-recent-picks-v1') || '[]')
    return Array.isArray(data) ? [...new Map(data.filter(validTitle).map(t => [keyOf(t), t])).values()].slice(0, 12) : []
  } catch { return [] }
}
export function rememberPick(history, title) {
  return [title, ...history.filter(item => keyOf(item) !== keyOf(title))].slice(0, 12)
}

export function surpriseMedia(random = Math.random) {
  return random() < .5 ? 'movie' : 'tv'
}
