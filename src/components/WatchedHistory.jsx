import { keyOf } from '../lib/library'
import TitleNotes, { FavoriteButton } from './TitleNotes'
import ShareTitle from './ShareTitle'
import Icon from './Icon'

export default function WatchedHistory({ titles, annotations, onAnnotate, disabled, onUndo, folders }) {
  return <details id="watched-history" className="history"><summary><span><Icon name="check" size={18}/>Watched history <span className="count">{titles.length}</span></span><span className="history-hint">Seen it. Loved it. On to the next.</span></summary><p className="history-copy">These titles are excluded from future picks. Undo to welcome them back. Keep your personal ratings and notes below.</p>{!titles.length && <p className="history-copy">No watched titles yet.</p>}{titles.map(title => <article className="watched-entry" key={keyOf(title)}><div className="history-row"><span>{title.title}<small>{title.type === 'movie' ? 'Movie' : 'TV Series'} · {title.year}</small></span><div className="watched-entry-actions"><FavoriteButton title={title} annotation={annotations[keyOf(title)]} onChange={patch => onAnnotate(title, patch)} disabled={disabled}/><button className="secondary" disabled={disabled} onClick={() => onUndo(title)}>Undo watched</button></div></div><TitleNotes folders={folders} title={title} annotation={annotations[keyOf(title)]} onChange={patch => onAnnotate(title, patch)} disabled={disabled}/><ShareTitle title={title}/></article>)}</details>
}
