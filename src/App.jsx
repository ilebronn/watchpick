import { useEffect, useRef, useState } from 'react'
import { keyOf, readLibrary, updateLibrary } from './lib/library'
import { details, discover, genreOptions, hasLiveConfig, loadGenres } from './lib/tmdb'
import Icon from './components/Icon'
import Header from './components/Header'
import AdvancedFilters from './components/AdvancedFilters'
import TitleSearch from './components/TitleSearch'
import CollectionSection from './components/CollectionSection'
import WatchedHistory from './components/WatchedHistory'
import { parseAnnotations, readAnnotations, updateAnnotation } from './lib/collection'
import PickHistory from './components/PickHistory'
import { defaultPreferences, mergeLibrary, readPickHistory, rememberPick, surpriseMedia } from './lib/features'
import FeaturedPreview from './components/FeaturedPreview'
import ResultCard from './components/ResultCard'
import DiscoveryExperience from './components/DiscoveryExperience'
import ChoiceGrid from './components/ChoiceGrid'
import MoviePlanner from './components/MoviePlanner'
import HiddenTitles from './components/HiddenTitles'
import UndoToast from './components/UndoToast'
import ConnectionStatus from './components/ConnectionStatus'
import { cleanWorkspace, defaultWorkspace, drawCandidates, readWorkspace, resolveGroup, mergeWorkspace, restoreTitleMembership } from './lib/experience'
import { selectPageCover } from './lib/hero'
import './App.css'
import './Experience.css'

const heroCover = selectPageCover()

export default function App() {
  const [type, setType] = useState('either')
  const [genre, setGenre] = useState('any')
  const [preferences, setPreferences] = useState({ ...defaultPreferences })
  const [sortOrder, setSortOrder] = useState('recent')
  const [annotations, setAnnotations] = useState(() => { try { return readAnnotations(localStorage) } catch { return {} } })
  const [recentPicks, setRecentPicks] = useState(() => { try { return readPickHistory(localStorage) } catch { return [] } })
  const [lists, setLists] = useState(null)
  const [library, setLibrary] = useState(() => { try { return readLibrary(localStorage) } catch { return { saved: [], watched: [] } } })
  const [result, setResult] = useState(null)
  const [choices, setChoices] = useState([])
  const [choiceCount, setChoiceCount] = useState(1)
  const [workspace, setWorkspace] = useState(() => { try { return readWorkspace(localStorage) } catch { return { ...defaultWorkspace } } })
  const [undoAction, setUndoAction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [empty, setEmpty] = useState(false)
  const [view, setView] = useState(() => navigator.onLine ? 'discover' : 'watchlist')
  const poolRef = useRef(null)
  const seenRef = useRef(new Set())
  const busyRef = useRef(false)
  const resultRef = useRef(null)

  useEffect(() => {
    let failed = false
    try {
      localStorage.setItem('watchpick-library-v1', JSON.stringify(library))
      localStorage.setItem('watchpick-recent-picks-v1', JSON.stringify(recentPicks))
      localStorage.setItem('watchpick-title-notes-v1', JSON.stringify(annotations))
      localStorage.setItem('watchpick-workspace-v1', JSON.stringify(workspace))
    }
    catch { failed = true }
    const timer = setTimeout(() => setStorageError(failed), 0)
    return () => clearTimeout(timer)
  }, [library, recentPicks, annotations, workspace])

  useEffect(() => {
    if (!hasLiveConfig) return
    let active = true
    loadGenres().then(data => { if (active) setLists(data) }).catch(() => {
      if (active) setError('Could not load TMDB genres. Check your connection and API configuration, then try again.')
    })
    return () => { active = false }
  }, [])

  function reset() {
    poolRef.current = null
    seenRef.current = new Set()
    setResult(null); setChoices([]); setEmpty(false); setError(''); setNotice('')
  }
  function changeType(value) { setType(value); setGenre('any'); if (value === 'tv') setPreferences(previous => ({ ...previous, runtime: 'any' })); reset() }

  function changePreference(key, value) { setPreferences(previous => ({ ...previous, [key]: value })); reset() }
  function resetPreferences() { setType('either'); setGenre('any'); setPreferences({ ...defaultPreferences }); reset() }
  function surprise() {
    if (busyRef.current) return
    const media = workspace.group.enabled ? 'either' : surpriseMedia()
    setType(media); setGenre('any'); setPreferences({ ...defaultPreferences }); reset()
    return pick({ type: media, genre: 'any', preferences: defaultPreferences })
  }
  function focusSection(id) {
    requestAnimationFrame(() => {
      const section = document.getElementById(id)
      if (!section) return
      if (section.tagName === 'DETAILS') section.open = true
      section.scrollIntoView({ block: 'start' })
      const target = (id === 'title-search' ? section.querySelector('input:not(:disabled)') : null) || section.querySelector('summary') || section
      target.focus({ preventScroll: true })
    })
  }
  function navigateHeader(destination) {
    if (destination === 'search') { setView('discover'); focusSection('title-search'); return }
    if (destination === 'recent') { focusSection('recent-picks'); return }
    if (destination === 'watched') { focusSection('watched-history'); return }
    setView(destination)
    focusSection(destination === 'watchlist' ? 'watchlist-heading' : 'main')
  }
  async function quickPick() {
    if (busyRef.current || !hasLiveConfig) return
    setView('discover')
    const picked = await surprise()
    focusSection(picked === false ? 'discovery-error' : 'recommendation')
  }
  function openTitle(title) {
    if (busyRef.current || library.watched.some(item => keyOf(item) === keyOf(title))) return
    resetPreferences()
    seenRef.current.add(keyOf(title))
    setType(title.type); setView('discover'); setResult(title)
    setRecentPicks(previous => rememberPick(previous, title))
    setNotice(`Opened ${title.title}. Discovery preferences have been reset.`)
    requestAnimationFrame(() => { resultRef.current?.scrollIntoView({ block: 'start' }); resultRef.current?.focus({ preventScroll: true }) })
  }
  function offerUndo(label, undo) { setUndoAction({ label, undo }) }
  function runUndo() {
    if (!undoAction || busyRef.current) return
    undoAction.undo(); setUndoAction(null); setNotice('Last action undone.')
  }
  function hideTitle(title) {
    setWorkspace(previous => ({ ...previous, hidden: [...previous.hidden.filter(t => keyOf(t) !== keyOf(title)), title] }))
    setResult(null); setChoices(previous => previous.filter(t => keyOf(t) !== keyOf(title)))
    offerUndo(`${title.title} hidden from recommendations.`, () => setWorkspace(previous => ({ ...previous, hidden: previous.hidden.filter(t => keyOf(t) !== keyOf(title)) })))
    setNotice('Title hidden. Manage exclusions under Not interested.')
  }
  function allowTitle(title) {
    setWorkspace(previous => ({ ...previous, hidden: previous.hidden.filter(t => keyOf(t) !== keyOf(title)) }))
    seenRef.current.delete(keyOf(title)); setEmpty(false)
    offerUndo(`${title.title} allowed again.`, () => setWorkspace(previous => ({ ...previous, hidden: [...previous.hidden.filter(t => keyOf(t) !== keyOf(title)), title] })))
  }
  function createFolder(name) {
    setWorkspace(previous => ({ ...previous, folders: [...previous.folders, name] }))
    setNotice(`Collection “${name}” created.`)
  }
  function deleteFolder(name) {
    const previousAssignments = Object.fromEntries(Object.entries(annotations).filter(([, value]) => value.folder === name))
    setWorkspace(previous => ({ ...previous, folders: previous.folders.filter(folder => folder !== name) }))
    setAnnotations(previous => Object.fromEntries(Object.entries(previous).map(([key, value]) => [key, value.folder === name ? { ...value, folder: '' } : value])))
    offerUndo(`Collection “${name}” removed. Titles are preserved.`, () => {
      setWorkspace(previous => ({ ...previous, folders: [...new Set([...previous.folders, name])] }))
      setAnnotations(previous => ({ ...previous, ...Object.fromEntries(Object.entries(previousAssignments).map(([key, value]) => [key, { ...value, ...previous[key], folder: previous[key]?.folder || name }])) }))
    })
  }
  function addPlan(plan) {
    setWorkspace(previous => ({ ...previous, plans: [...previous.plans, plan] }))
    offerUndo(`Planned ${plan.title.title} for ${plan.date}.`, () => setWorkspace(previous => ({ ...previous, plans: previous.plans.filter(item => item.id !== plan.id) })))
  }
  function removePlan(plan) {
    setWorkspace(previous => ({ ...previous, plans: previous.plans.filter(item => item.id !== plan.id) }))
    offerUndo('Movie-night plan removed.', () => setWorkspace(previous => ({ ...previous, plans: [...previous.plans.filter(item => item.id !== plan.id), plan] })))
  }
  function chooseRecommendation(title) { setChoices([]); setResult(title); focusSection('recommendation') }
  function annotateTitle(title, patch) {
    setAnnotations(previous => updateAnnotation(previous, title, patch))
  }
  function exportLibrary() {
    const keys = new Set([...library.saved, ...library.watched, ...workspace.hidden, ...workspace.plans.map(plan => plan.title)].map(keyOf))
    const notes = Object.fromEntries(Object.entries(annotations).filter(([key]) => keys.has(key)))
    const data = JSON.stringify({ app: 'WatchPick', version: 1, saved: library.saved, watched: library.watched, annotations: notes, workspace }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'watchpick-library.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Library exported. Keep the JSON file to restore your titles later.')
  }
  async function importLibrary(file) {
    if (busyRef.current) return
    busyRef.current = true; setLoading(true); setLibraryError('')
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a WatchPick JSON backup smaller than 2 MB.')
      const parsed = JSON.parse(await file.text())
      mergeLibrary({ saved: [], watched: [] }, parsed)
      const importedNotes = parseAnnotations(parsed.annotations, true)
      const importedWorkspace = cleanWorkspace(parsed.workspace, true)
      importedWorkspace.folders = [...new Set([...importedWorkspace.folders, ...Object.values(importedNotes).map(value => value.folder).filter(Boolean)])]
      setWorkspace(previous => mergeWorkspace(previous, importedWorkspace))
      setAnnotations(previous => ({ ...importedNotes, ...previous }))
      setLibrary(previous => mergeLibrary(previous, parsed))
      reset(); setUndoAction(null); setNotice('Library imported and merged. Watched exclusions are preserved.')
    } catch (err) { setLibraryError(err instanceof SyntaxError ? 'This file is not valid JSON. Your library has not changed.' : err.message) }
    finally { busyRef.current = false; setLoading(false) }
  }
  async function pick(overrides) {
    if (busyRef.current) return
    if (!hasLiveConfig) { setError('TMDB configuration is missing. Add VITE_TMDB_READ_TOKEN to .env.local, then restart the development server.'); return }
    const selection = overrides?.preferences && ['movie', 'tv', 'either'].includes(overrides.type) ? overrides : { type, genre, preferences }
    busyRef.current = true
    setLoading(true); setError(''); setNotice(''); setEmpty(false)
    try {
      let genres = lists
      if (!genres) { genres = await loadGenres(); setLists(genres) }
      const groupSelection = resolveGroup(workspace.group, selection.type, selection.genre)
      let pool = poolRef.current
      if (!pool) {
        pool = await discover(groupSelection.type, selection.genre, genres, selection.preferences, groupSelection.genres)
        poolRef.current = pool
      }
      const draw = drawCandidates(pool, [...library.watched, ...workspace.hidden], seenRef.current, result, choiceCount)
      if (!draw.titles.length) { setResult(null); setChoices([]); setEmpty(true); focusSection('recommendation'); return }
      const full = await Promise.all(draw.titles.map(title => details(title, genres)))
      seenRef.current = draw.nextSeen
      if (draw.restarted) setNotice('You’ve explored this pool. Starting a fresh round of eligible titles.')
      setChoices(choiceCount === 3 ? full : [])
      setResult(choiceCount === 3 ? null : full[0])
      setRecentPicks(previous => full.reduce((history, title) => rememberPick(history, title), previous))
      focusSection('recommendation')
      return full[0]
    } catch (err) { setError(err.name === 'TimeoutError' ? 'TMDB took too long to respond. Please try again.' : err instanceof TypeError ? 'Could not connect to TMDB. Check your connection and try again.' : err.message); return false }
    finally { busyRef.current = false; setLoading(false) }
  }
  function toggleSave(title) {
    const exists = library.saved.some(t => keyOf(t) === keyOf(title))
    setLibrary(previous => updateLibrary(previous, 'toggleSave', title))
    setNotice(exists ? `${title.title} removed from your watchlist.` : `${title.title} added to your watchlist.`)
    offerUndo(exists ? `${title.title} removed.` : `${title.title} saved.`, () => setLibrary(previous => restoreTitleMembership(previous, title, library)))
  }
  function markWatched(title) {
    offerUndo(`${title.title} marked watched.`, () => setLibrary(previous => restoreTitleMembership(previous, title, library)))
    setLibrary(previous => updateLibrary(previous, 'watch', title))
    if (result && keyOf(result) === keyOf(title)) setResult(null)
    setNotice(`${title.title} marked as watched. It will be excluded from future picks.`)
  }
  function undoWatched(title) {
    setLibrary(previous => updateLibrary(previous, 'undo', title))
    seenRef.current.delete(keyOf(title)); setEmpty(false)
    setNotice(`${title.title} can appear in your picks again.`)
    offerUndo(`${title.title} removed from watched.`, () => setLibrary(previous => restoreTitleMembership(previous, title, library)))
  }
  const genres = lists ? genreOptions(lists, type) : []
  const saved = result && library.saved.some(t => keyOf(t) === keyOf(result))

  return <><a href="#main" className="skip-link">Skip to content</a><Header view={view} savedCount={library.saved.length} recentCount={recentPicks.length} watchedCount={library.watched.length} onNavigate={navigateHeader} onQuickPick={quickPick} busy={loading} configured={hasLiveConfig}/>
  <ConnectionStatus/><main id="main" tabIndex={-1}><section className="hero"><div className="hero-scene" style={{ '--hero-image': `url("${heroCover.image}")` }} aria-hidden="true"/><div className="hero-copy"><div className="eyebrow"><Icon name="film" size={14}/> YOUR NEXT WATCH, FOUND.</div><h1>Less scrolling.<br/><span>More watching.</span></h1><p>Find your next movie night favorite or binge-worthy series.<br/>A little less searching. A lot more good stories.</p><div className="hero-actions"><a href={view === 'discover' ? '#preferences' : '#watchlist-heading'} className="primary hero-cta">{view === 'discover' ? 'Find my next watch' : 'Explore my watchlist'}<Icon name="arrow" size={18}/></a><div className="discovery-credit"><span className="discovery-credit-icon"><Icon name="film" size={15}/></span><span className="discovery-credit-label">{hasLiveConfig ? 'Discovery powered by' : 'Connect to discover'}</span><span className="discovery-credit-provider">TMDB</span></div></div></div><div className="hero-caption"><span className="cover-label">ON THE COVER</span><strong>{heroCover.title}</strong><span>{heroCover.year} <i/> Imagery via TMDB</span></div></section>
  {view === 'discover' && <><section id="preferences" className="filter-panel" aria-label="Recommendation preferences"><div className="filter-type"><span className="field-label" id="type-label"><b>I’m in the mood for</b></span><div className="segmented" role="group" aria-labelledby="type-label">{[['movie', 'Movie', 'film'], ['tv', 'TV Series', 'tv'], ['either', 'Either', 'shuffle']].map(([value, label, icon]) => <button key={value} aria-pressed={type === value} disabled={loading} onClick={() => changeType(value)}><Icon name={icon} size={17}/>{label}</button>)}</div></div><div className="filter-genre"><label className="field-label" htmlFor="genre"><b>Make it a little more specific</b></label><select id="genre" value={genre} disabled={loading || !lists} onChange={e => { setGenre(e.target.value); reset() }}><option value="any">Any genre</option>{genres.map(g => <option key={g}>{g}</option>)}</select>{hasLiveConfig && !lists && <small>Loading TMDB genres…</small>}</div><button className="primary pick-button" onClick={pick} disabled={loading || !hasLiveConfig}><Icon name="shuffle"/>{loading ? 'Finding your next watch…' : 'Pick for me'}<Icon name="arrow" size={18}/></button></section><AdvancedFilters preferences={preferences} onChange={changePreference} onMood={value => { setGenre(value); reset() }} onSurprise={surprise} onReset={resetPreferences} loading={loading || !hasLiveConfig} type={type} genre={genre} genres={genres}/><DiscoveryExperience count={choiceCount} onCount={value => { setChoiceCount(value); reset() }} pages={preferences.candidatePages} onPages={value => changePreference('candidatePages', value)} spoilerFree={workspace.spoilerFree} onSpoilers={value => setWorkspace(previous => ({ ...previous, spoilerFree: value }))} group={workspace.group} onGroup={group => { setWorkspace(previous => ({ ...previous, group })); reset() }} genres={lists ? genreOptions(lists, 'either') : []} disabled={loading || !hasLiveConfig}/><p className="pool-note"><span className="tiny-dot"/>A little serendipity, tailored to you. Picks come from up to {preferences.candidatePages * 20} matching results per media type, not the entire TMDB catalog.</p></>}
  {view === 'discover' && <TitleSearch disabled={loading || !hasLiveConfig} onChoose={openTitle} watched={library.watched}/>}
  {!hasLiveConfig && <div className="setup-notice" role="status"><strong>Connect TMDB to start discovering</strong><p>Add your API Read Access Token as <code>VITE_TMDB_READ_TOKEN</code> in <code>.env.local</code>, then restart Vite. Keep it out of chat and Git. VITE_ values are visible in browser builds.</p><p>Your saved watchlist and watched history are still available.</p></div>}
  <div className="announcements" aria-live="polite" role="status">{notice && <p>{notice}</p>}</div>{storageError && <div className="error" role="alert">Your browser could not save your library. Changes will last only for this session.</div>}
  {error && <div id="discovery-error" tabIndex={-1} className="error" role="alert"><div><strong>We couldn’t find your next watch.</strong><p>{error}</p></div><button className="secondary" disabled={loading} onClick={pick}>Try again</button></div>}
  {view === 'discover' && <section id="recommendation" className="recommendation" ref={resultRef} tabIndex={-1} aria-label="Recommendation"><div className="section-heading"><h2>{result ? 'Tonight’s pick' : choices.length ? 'Choose your next watch' : 'A few worlds worth getting lost in'}</h2><span>{result ? 'A GOOD NIGHT IN, SORTED.' : 'FEATURED MOVIES & SERIES'}</span></div>{loading && <div className="loading-state" role="status"><span className="spinner"/>Finding a story worth your time…</div>}{!loading && result && <ResultCard key={keyOf(result)} title={result} saved={saved} onSave={() => toggleSave(result)} onWatched={() => markWatched(result)} onPick={pick} loading={loading} spoilerFree={workspace.spoilerFree} onHide={() => hideTitle(result)}/>}{!loading && choices.length > 0 && <ChoiceGrid titles={choices} onChoose={chooseRecommendation} onAgain={pick} disabled={loading}/>}{!loading && empty && <div className="empty-state"><Icon name="film" size={38}/><h3>No unwatched matches this time.</h3><p>Try another genre, year, rating, or runtime, or undo a watched title below.</p><button className="secondary" onClick={resetPreferences}>Reset filters</button></div>}{!loading && !result && !choices.length && !empty && <FeaturedPreview onPick={pick} disabled={!hasLiveConfig}/>}</section>}
  <PickHistory titles={recentPicks} watched={library.watched} disabled={loading} onRevisit={openTitle} onClear={() => { setRecentPicks([]); setNotice('Pick history cleared. Your library is unchanged.') }}/><CollectionSection library={library} annotations={annotations} onAnnotate={annotateTitle} order={sortOrder} onOrder={setSortOrder} onExport={exportLibrary} onImport={importLibrary} disabled={loading} error={libraryError} view={view} onDiscover={() => navigateHeader('discover')} onWatched={markWatched} onRemove={toggleSave} onOpen={openTitle} currentTitle={result} folders={workspace.folders} onCreateFolder={createFolder} onDeleteFolder={deleteFolder}/>
  <WatchedHistory titles={library.watched} annotations={annotations} onAnnotate={annotateTitle} disabled={loading} onUndo={undoWatched} folders={workspace.folders}/><HiddenTitles titles={workspace.hidden} disabled={loading} onRestore={allowTitle}/><MoviePlanner titles={library.saved} plans={workspace.plans} disabled={loading} onAdd={addPlan} onRemove={removePlan} onReschedule={(id, date) => setWorkspace(previous => ({ ...previous, plans: previous.plans.map(plan => plan.id === id ? { ...plan, date } : plan) }))}/>
  <aside className="how-it-works"><div><Icon name="shuffle" size={21}/><p><strong>Discovery, made effortless</strong>Movie, series, or open to anything.</p></div><div><Icon name="bookmark" size={21}/><p><strong>Keep the good ones close</strong>A surprise that fits your taste.</p></div><div><Icon name="check" size={21}/><p><strong>Always something new</strong>Save it for later or settle in.</p></div></aside></main>
  <footer><div className="footer-top"><a href="#" className="brand" onClick={() => setView('discover')}><Icon name="film" size={20}/>Watch<span>Pick</span></a><p>Less deciding. More discovering.</p><span>Made for a good night in.</span></div><div className="credits"><span>ABOUT & CREDITS · WatchPick recommends titles. It does not stream or download them.</span><div className="tmdb-credit"><a className="tmdb-logo-link" href="https://www.themoviedb.org" target="_blank" rel="noreferrer" aria-label="The Movie Database"><img src="/tmdb.svg" alt="TMDB" width="72" height="52"/></a><div className="tmdb-notice"><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><a className="tmdb-license" href="/tmdb-attribution.txt" target="_blank" rel="noreferrer">Logo credits</a></div></div></div></footer><UndoToast action={undoAction} onUndo={runUndo} onDismiss={() => setUndoAction(null)} disabled={loading}/></>
}
