import { useEffect, useRef, useState } from 'react'
import { bundledPreviews } from '../data/featured'
import { hasLiveConfig } from '../lib/tmdb'
import { readPreviewKeys, rememberPreviews, selectPreviews, fetchPreviewPool } from '../lib/previews'
import { keyOf } from '../lib/library'
import Icon from './Icon'
import Poster from './Poster'

// Share startup work across StrictMode effects and remounts; no duplicate API calls.
let startupRequest
function previewStorage() { try { return sessionStorage } catch { return null } }

export default function FeaturedPreview({ onPick, disabled }) {
  const [titles, setTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const pool = useRef(bundledPreviews)
  const refreshBusy = useRef(false)

  function show(poolToUse) {
    const storage = previewStorage()
    const next = selectPreviews(poolToUse, readPreviewKeys(storage))
    rememberPreviews(storage, next)
    setTitles(next)
  }
  useEffect(() => {
    let active = true
    startupRequest ??= hasLiveConfig ? fetchPreviewPool() : Promise.resolve(bundledPreviews)
    startupRequest.then(data => {
      if (!active) return
      if (!data.length) throw new Error('No featured posters available.')
      pool.current = data; show(data); setLive(hasLiveConfig)
    }).catch(() => {
      if (!active) return
      startupRequest = null
      show(bundledPreviews)
      setError('TMDB previews could not load. Showing local editorial artwork.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function refresh() {
    if (refreshBusy.current) return
    refreshBusy.current = true
    setError('')
    try {
      if (hasLiveConfig && !live) {
        setLoading(true)
        const data = await fetchPreviewPool()
        if (!data.length) throw new Error('No featured posters available.')
        pool.current = data; setLive(true)
      }
      show(pool.current)
    } catch { setError('Could not refresh TMDB previews. Try again shortly.'); show(bundledPreviews) }
    finally { refreshBusy.current = false; setLoading(false) }
  }

  return <div className="welcome-card"><div className="welcome-intro"><span className="eyebrow">THE POSSIBILITIES ARE ENDLESS</span><h3>Big stories.<br/><em>Your kind of night.</em></h3><p>From quiet little stories to the edge of the universe. Let your next favorite find you.</p><button className="text-button gold" onClick={onPick} disabled={disabled}>Make the first pick<Icon name="arrow" size={18}/></button><button className="secondary refresh-previews" onClick={refresh} disabled={loading}><Icon name="shuffle" size={17}/>{loading ? 'Loading previews…' : 'Refresh previews'}</button><span className="catalog-note">{live ? 'FRESH TMDB PREVIEWS · INDEPENDENT OF YOUR FILTERS.' : 'ROTATING EDITORIAL ARTWORK · PICKS USE LIVE TMDB.'}</span>{error && <p className="preview-warning" role="status">{error}</p>}</div><div className="film-shelf" aria-busy={loading}>{loading && !titles.length ? [0, 1, 2, 3].map(index => <div key={index} className="preview-skeleton" aria-hidden="true"/>) : titles.map((title, index) => <figure key={keyOf(title)}><div className="shelf-image"><Poster title={title}/><span>0{index + 1}</span></div><figcaption><span>{title.type === 'movie' ? 'FEATURE FILM' : 'TELEVISION'}</span><strong>{title.title}</strong></figcaption></figure>)}</div></div>
}
