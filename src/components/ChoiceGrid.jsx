import { keyOf } from '../lib/library'
import Poster from './Poster'

export default function ChoiceGrid({ titles, onChoose, onAgain, disabled }) {
  return <div className="choice-section"><p className="feature-note">{titles.length} distinct unwatched choices from this round. Open one to see details and save it.</p><div className="choice-grid">{titles.map(title => <article key={keyOf(title)}><Poster title={title}/><div><small>{title.type === 'movie' ? 'Movie' : 'TV series'} · {title.year}</small><h3>{title.title}</h3><p>{title.genres.join(' · ') || 'Genres unavailable'}</p><button className="primary" disabled={disabled} onClick={() => onChoose(title)}>Choose this one</button></div></article>)}</div><button className="secondary" disabled={disabled} onClick={onAgain}>Show more choices</button></div>
}
