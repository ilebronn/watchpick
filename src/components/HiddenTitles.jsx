import { keyOf } from '../lib/library'

export default function HiddenTitles({ titles, onRestore, disabled }) {
  return <details className="hidden-titles"><summary>Not interested<span>{titles.length} hidden</span></summary><p className="feature-note">These titles are excluded from random recommendations without being marked watched. Existing saved copies remain in your library.</p>{!titles.length && <p className="feature-note">Nothing hidden yet. Use “Not interested” on a recommendation.</p>}{titles.map(title => <div key={keyOf(title)}><span>{title.title}</span><button className="secondary" disabled={disabled} onClick={() => onRestore(title)}>Allow again</button></div>)}</details>
}
