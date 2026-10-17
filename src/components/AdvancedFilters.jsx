import { originalLanguages } from '../lib/collection'
import { defaultPreferences, moods } from '../lib/features'

export default function AdvancedFilters({ preferences, onChange, onMood, onSurprise, onReset, loading, type, genre, genres }) {
  return <section className="extras-panel" aria-label="More discovery options">
    <div className="mood-row"><span>Set the mood</span><div>{moods.filter(mood => genres.includes(mood.genre)).map(mood => <button className={genre === mood.genre ? 'mood-active' : ''} aria-pressed={genre === mood.genre} key={mood.label} disabled={loading} onClick={() => onMood(mood.genre)}>{mood.label}</button>)}</div><button className="text-button gold" disabled={loading} onClick={onSurprise}>Surprise me ↗</button></div>
    <details className="advanced-options"><summary>Fine-tune your pick<span>{Object.entries(preferences).filter(([key, value]) => value !== defaultPreferences[key]).length || 'Optional'}</span></summary><div className="advanced-grid">
      <label>Release / premiere era<select value={preferences.era} disabled={loading} onChange={e => onChange('era', e.target.value)}><option value="any">Any year</option><option value="2020s">2020–2029</option><option value="2010s">2010–2019</option><option value="2000s">2000–2009</option><option value="classics">Before 2000</option></select></label>
      <label>Minimum TMDB user rating<select value={preferences.minRating} disabled={loading} onChange={e => onChange('minRating', e.target.value)}><option value="0">Any rating</option><option value="6">6.0 and above</option><option value="7">7.0 and above</option><option value="8">8.0 and above</option></select><small>Requires at least 50 TMDB votes.</small></label>
      <label>Movie runtime<select value={preferences.runtime} disabled={loading || type === 'tv'} onChange={e => onChange('runtime', e.target.value)}><option value="any">Any length</option><option value="short">Up to 100 min</option><option value="standard">101–140 min</option><option value="epic">141+ min</option></select><small>Movies only. Series are unaffected.</small></label>
      <label>Original language<select value={preferences.language} disabled={loading} onChange={e => onChange('language', e.target.value)}><option value="any">Any language</option>{originalLanguages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><small>Original language, not subtitle or dub availability.</small></label>
    </div><button className="text-button" onClick={onReset} disabled={loading}>Reset all preferences</button></details>
  </section>
}
