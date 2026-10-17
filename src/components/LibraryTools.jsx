import { useRef } from 'react'

export default function LibraryTools({ order, onOrder, onExport, onImport, disabled, count }) {
  const input = useRef(null)
  return <div className="library-tools"><label>Sort watchlist<select value={order} onChange={e => onOrder(e.target.value)}><option value="recent">Recently saved</option><option value="title">Title A–Z</option><option value="year">Newest release</option><option value="rating">Highest TMDB rating</option></select></label><div><button className="secondary" disabled={disabled || !count} onClick={onExport}>Export library</button><button className="secondary" disabled={disabled} onClick={() => input.current?.click()}>Import library</button><input ref={input} type="file" accept=".json,application/json" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImport(file) }}/></div><p className="feature-note">JSON backups include your library, favorites, personal ratings, and notes. Imports merge safely; watched titles remain excluded.</p></div>
}
