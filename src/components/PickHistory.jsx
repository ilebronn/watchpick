import { keyOf } from '../lib/library'
import Poster from './Poster'

export default function PickHistory({ titles, watched, disabled, onRevisit, onClear }) {
  if (!titles.length) return null
  return <details id="recent-picks" className="pick-history"><summary><span>Recently discovered <span className="history-total">{titles.length}</span></span><span>Revisit your last 12 picks</span></summary><p className="feature-note">Revisiting opens a title’s details and resets discovery preferences. Watched titles stay excluded until you undo them.</p><div className="recent-grid">{titles.map(title => {
    const seen = watched.some(item => keyOf(item) === keyOf(title))
    return <button key={keyOf(title)} className="recent-title" disabled={disabled || seen} onClick={() => onRevisit(title)}><Poster title={title}/><span><strong>{title.title}</strong><small>{seen ? 'Watched' : `${title.type === 'movie' ? 'Movie' : 'Series'} · ${title.year}`}</small></span></button>
  })}</div><button className="text-button" disabled={disabled} onClick={onClear}>Clear pick history</button></details>
}
