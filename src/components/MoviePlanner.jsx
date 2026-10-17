import { useState } from 'react'
import { keyOf } from '../lib/library'
import { validDate } from '../lib/experience'

export default function MoviePlanner({ titles, plans, onAdd, onRemove, onReschedule, disabled }) {
  const [titleKey, setTitleKey] = useState('')
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  function submit(event) {
    event.preventDefault()
    const title = titles.find(item => keyOf(item) === titleKey)
    if (!title || !validDate(date)) { setMessage('Choose a saved title and a valid date.'); return }
    if (plans.some(plan => keyOf(plan.title) === titleKey && plan.date === date)) { setMessage('This title is already planned for that date.'); return }
    onAdd({ id: crypto.randomUUID(), title, date }); setMessage('Movie night added.'); setDate('')
  }
  return <details className="movie-planner"><summary>Plan a movie night<span>{plans.length} planned</span></summary><p className="feature-note">Save a title first, then choose a date. Plans stay on this device; no reminders are sent.</p><form onSubmit={submit}><label>Saved title<select value={titleKey} required disabled={disabled || !titles.length} onChange={e => setTitleKey(e.target.value)}><option value="">Choose a title</option>{titles.map(title => <option key={keyOf(title)} value={keyOf(title)}>{title.title}</option>)}</select></label><label>Date<input type="date" value={date} required disabled={disabled} onChange={e => setDate(e.target.value)}/></label><button className="primary" disabled={disabled || !titles.length}>Plan a night</button></form><p className="feature-note" role="status">{message}</p><div className="planned-nights">{[...plans].sort((a, b) => a.date.localeCompare(b.date)).map(plan => <article key={plan.id}><span><strong>{plan.title.title}</strong><small>{plan.title.type === 'movie' ? 'Movie' : 'TV series'}</small></span><label>Scheduled date<input type="date" value={plan.date} disabled={disabled} onChange={e => { if (validDate(e.target.value)) onReschedule(plan.id, e.target.value) }}/></label><button className="secondary" disabled={disabled} onClick={() => onRemove(plan)}>Remove plan</button></article>)}</div></details>
}
