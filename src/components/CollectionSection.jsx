import { useState } from 'react'
import { keyOf } from '../lib/library'
import { sortWatchlist } from '../lib/features'
import { chooseSavedTitle, collectionStats, filterCollection } from '../lib/collection'
import LibraryTools from './LibraryTools'
import FolderManager from './FolderManager'
import CollectionControls from './CollectionControls'
import CollectionStats from './CollectionStats'
import TitleNotes, { FavoriteButton } from './TitleNotes'
import ShareTitle from './ShareTitle'
import Poster from './Poster'
import Icon from './Icon'

const initialFilters = { query: '', type: 'either', favorites: false, folder: 'all' }

export default function CollectionSection({ library, annotations, onAnnotate, order, onOrder, onExport, onImport, disabled, error, view, onDiscover, onWatched, onRemove, onOpen, currentTitle, folders, onCreateFolder, onDeleteFolder }) {
  const [filters, setFilters] = useState(initialFilters)
  const activeFilters = !['all', 'unfiled'].includes(filters.folder) && !folders.includes(filters.folder) ? { ...filters, folder: 'all' } : filters
  const visible = sortWatchlist(filterCollection(library.saved, annotations, activeFilters), order)
  return <section className="library-section" aria-labelledby="watchlist-heading"><div className="section-heading"><div><h2 id="watchlist-heading" tabIndex={-1}>Your watchlist <span className="inline-count">{library.saved.length}</span></h2><p>Your next great night in, all in one place.</p></div>{view === 'watchlist' && <button className="text-button gold" onClick={onDiscover}>Discover more<Icon name="arrow" size={17}/></button>}</div>
    <FolderManager folders={folders} onCreate={onCreateFolder} onDelete={onDeleteFolder} disabled={disabled}/><CollectionStats stats={collectionStats(library, annotations)}/>
    <LibraryTools order={order} onOrder={onOrder} onExport={onExport} onImport={onImport} disabled={disabled} count={library.saved.length + library.watched.length}/>
    {error && <p className="feature-error" role="alert">{error}</p>}
    {library.saved.length > 0 && <CollectionControls folders={folders} filters={activeFilters} onChange={patch => setFilters(previous => ({ ...previous, ...patch }))} onReset={() => setFilters(initialFilters)} onPick={() => { const title = chooseSavedTitle(visible, currentTitle); if (title) onOpen(title) }} count={visible.length} total={library.saved.length} disabled={disabled}/>}
    {visible.length > 0 ? <div className="library-grid">{visible.map(title => <article className="library-card" key={keyOf(title)}><Poster title={title}/><div><span className="small-meta">{title.type === 'movie' ? 'MOVIE' : 'TV SERIES'} · {title.year}</span><h3>{title.title}</h3><FavoriteButton title={title} annotation={annotations[keyOf(title)]} onChange={patch => onAnnotate(title, patch)} disabled={disabled}/><div className="library-actions"><button className="text-button" disabled={disabled} onClick={() => onWatched(title)}><Icon name="check" size={16}/>Watched</button><button className="icon-button" disabled={disabled} aria-label={`Remove ${title.title} from watchlist`} onClick={() => onRemove(title)}><Icon name="close" size={17}/></button></div><TitleNotes folders={folders} title={title} annotation={annotations[keyOf(title)]} onChange={patch => onAnnotate(title, patch)} disabled={disabled}/><ShareTitle title={title}/></div></article>)}</div> : library.saved.length ? <div className="empty-library"><div><h3>No saved titles match these filters.</h3><p>Try another title, note, media type, or turn off favorites only.</p><button className="text-button gold" onClick={() => setFilters(initialFilters)}>Clear library filters</button></div></div> : <div className="empty-library"><span className="empty-icon"><Icon name="bookmark" size={25}/></span><div><h3>A home for your “watch it later” titles.</h3><p>Save a pick and it’ll be right here when you’re ready.</p></div></div>}
  </section>
}
