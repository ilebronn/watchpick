import { useEffect, useRef } from 'react'
import Icon from './Icon'
import './Header.css'

export default function Header({ view, savedCount, recentCount, watchedCount, onNavigate, onQuickPick, busy, configured }) {
  const shortcuts = useRef(null)
  const trigger = useRef(null)

  useEffect(() => {
    function closeOutside(event) {
      if (shortcuts.current?.open && !shortcuts.current.contains(event.target)) shortcuts.current.open = false
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape' && shortcuts.current?.open) {
        shortcuts.current.open = false
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function navigate(destination) {
    if (shortcuts.current) shortcuts.current.open = false
    onNavigate(destination)
  }

  return <header className="cinema-header">
    <a className="app-logo" href="#main" onClick={event => { event.preventDefault(); navigate('discover') }} aria-label="WatchPick home">
      <span className="app-logomark" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="m8 5 11 7L8 19Z" fill="currentColor"/></svg></span>
      watchpick<span className="logo-dot">.</span>
    </a>
    <nav className="app-navigation" aria-label="Main navigation">
      <button aria-current={view === 'discover' ? 'page' : undefined} onClick={() => navigate('discover')}><Icon name="shuffle" size={18}/>Discover</button>
      <button aria-current={view === 'watchlist' ? 'page' : undefined} onClick={() => navigate('watchlist')}><Icon name="bookmark" size={18}/>My watchlist<span className="nav-count" aria-label={`${savedCount} saved titles`}>{savedCount}</span></button>
    </nav>
    <div className="header-actions">
      <button className="header-search" onClick={() => navigate('search')} aria-label="Open title search" title="Search movies and series"><Icon name="search" size={20}/><span>Search</span></button>
      <button className="header-shuffle" disabled={busy || !configured} onClick={onQuickPick} title={configured ? 'Reset preferences and get a surprise recommendation' : 'Configure TMDB to start picking'} aria-label={busy ? 'Finding a recommendation' : 'Surprise me with a recommendation'}><Icon name="shuffle" size={19}/><span>{busy ? 'Picking…' : 'Quick pick'}</span></button>
      <details className="header-shortcuts" ref={shortcuts}>
        <summary ref={trigger} aria-label="Activity and library shortcuts" title="Open library shortcuts"><Icon name="history" size={20}/><span className="shortcuts-label">Activity</span><Icon name="chevron" size={14}/></summary>
        <div className="shortcuts-panel"><span className="shortcuts-heading">Your watch space</span>
          <button onClick={() => navigate('recent')} disabled={!recentCount}><Icon name="history" size={19}/><span>Recent picks<small>{recentCount ? 'Revisit your discoveries' : 'Make a pick to start your history'}</small></span><b>{recentCount}</b></button>
          <button onClick={() => navigate('watched')}><Icon name="check" size={19}/><span>Watched history<small>Manage excluded titles</small></span><b>{watchedCount}</b></button>
          <button onClick={() => navigate('watchlist')}><Icon name="bookmark" size={19}/><span>Saved for later<small>Your personal watchlist</small></span><b>{savedCount}</b></button>
        </div>
      </details>
    </div>
  </header>
}
