import { useEffect, useRef, useState } from 'react'
import { details, loadGenres, searchTitles } from '../lib/tmdb'
import { keyOf } from '../lib/library'
import Poster from './Poster'

export default function TitleSearch({ disabled, onChoose, watched }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('either')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef(null)
  const genres = useRef(null)
  const busy = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])

  async function search(event) {
    event.preventDefault()
    if (busy.current || disabled || !query.trim()) return
    busy.current = true
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    setLoading(true); setError(''); setSearched(false); setResults([])
    try {
      if (!genres.current) genres.current = await loadGenres()
      if (abort.signal.aborted) return
      const titles = await searchTitles(query.trim(), type, genres.current, abort.signal)
      if (!abort.signal.aborted) { setResults(titles); setSearched(true) }
    } catch (err) { if (!abort.signal.aborted) setError(err instanceof TypeError ? 'Search could not connect. Check your connection and retry.' : err.message) }
    finally { busy.current = false; if (!abort.signal.aborted) setLoading(false) }
  }

  async function choose(title) {
    if (busy.current || disabled) return
    busy.current = true
    const abort = new AbortController()
    controller.current = abort
    setLoading(true); setError('')
    try {
      const full = await details(title, genres.current, abort.signal)
      if (!abort.signal.aborted) onChoose(full)
    } catch (err) { if (!abort.signal.aborted) setError(err.message) }
    finally { busy.current = false; if (!abort.signal.aborted) setLoading(false) }
  }
  function clearResults() { setResults([]); setSearched(false); setError('') }

  return <details id="title-search" className="title-search"><summary><span>Have a title in mind?</span><span>Search movies & series</span></summary><form onSubmit={search}><label className="search-input-label">Title<input type="search" value={query} disabled={disabled || loading} maxLength={150} onChange={e => { setQuery(e.target.value); clearResults() }} placeholder="Try Interstellar or The Bear" required/></label><label>Media<select disabled={disabled || loading} value={type} onChange={e => { setType(e.target.value); clearResults() }}><option value="either">Movies & series</option><option value="movie">Movies</option><option value="tv">TV series</option></select></label><button className="primary" disabled={disabled || loading || !query.trim()}>{loading ? 'Searching…' : 'Search titles'}</button></form><p className="feature-note">Searches up to 20 TMDB results per media type. Search is independent of discovery filters. Opening a title resets those filters.</p>{error && <p role="alert" className="feature-error">{error}</p>}<div aria-live="polite">{searched && <p className="feature-note">{results.length ? `${results.length} matching titles` : 'No titles found. Try a different name.'}</p>}</div><div className="search-results">{results.map(title => {
    const seen = watched.some(item => keyOf(item) === keyOf(title))
    return <button className="search-result" key={keyOf(title)} disabled={loading || disabled || seen} onClick={() => choose(title)}><Poster title={title}/><span><strong>{title.title}</strong><small>{title.type === 'movie' ? 'Movie' : 'TV series'} · {title.year}</small><small>{seen ? 'Watched · undo in history to open' : 'Open details →'}</small></span></button>
  })}</div></details>
}
