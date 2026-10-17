export const heroCovers = [
  { id: 'interstellar', title: 'Interstellar', year: '2014', image: '/posters/interstellar-backdrop.jpg' },
  { id: 'inception', title: 'Inception', year: '2010', image: '/posters/inception-backdrop.jpg' },
  { id: 'stranger-things', title: 'Stranger Things', year: '2016', image: '/posters/stranger-things-backdrop.jpg' },
  { id: 'grand-budapest', title: 'The Grand Budapest Hotel', year: '2014', image: '/posters/grand-budapest-backdrop.jpg' },
]

const storageKey = 'watchpick-hero-cycle-v1'
const legacyKey = 'watchpick-last-hero'

export function chooseHeroCover(previousId, random = Math.random) {
  const candidates = heroCovers.filter(cover => cover.id !== previousId)
  return candidates[Math.floor(random() * candidates.length)]
}

function shuffle(ids, random) {
  const shuffled = [...ids]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// A persisted shuffled deck survives reloads. Consume every cover before reshuffling.
// Called once outside React to avoid consuming two covers in StrictMode.
export function selectPageCover(storage, random = Math.random) {
  const ids = heroCovers.map(cover => cover.id)
  let previousId
  let remaining = []
  try {
    storage ??= globalThis.sessionStorage
    previousId = storage?.getItem(legacyKey)
    const cycle = JSON.parse(storage?.getItem(storageKey) || 'null')
    if (cycle && ids.includes(cycle.previousId) && Array.isArray(cycle.remaining) &&
      cycle.remaining.every(id => ids.includes(id) && id !== cycle.previousId) &&
      new Set(cycle.remaining).size === cycle.remaining.length) {
      previousId = cycle.previousId
      remaining = cycle.remaining
    }
  } catch { /* Invalid or restricted storage starts a new shuffled round. */ }

  if (!remaining.length) {
    remaining = shuffle(ids, random)
    // The first card of a fresh round must differ from the last displayed card.
    if (remaining[0] === previousId && remaining.length > 1) {
      const j = 1 + Math.floor(random() * (remaining.length - 1))
      ;[remaining[0], remaining[j]] = [remaining[j], remaining[0]]
    }
  }

  const nextId = remaining.shift()
  const cover = heroCovers.find(item => item.id === nextId)
  try {
    storage?.setItem(storageKey, JSON.stringify({ previousId: cover.id, remaining }))
    storage?.setItem(legacyKey, cover.id)
  } catch { /* A cover still loads when persistence is unavailable. */ }
  return cover
}
