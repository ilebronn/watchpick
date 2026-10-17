import { useState } from 'react'
import { tmdbTitleUrl } from '../lib/collection'

export default function ShareTitle({ title }) {
  const [message, setMessage] = useState('')
  const [fallback, setFallback] = useState(false)
  const url = tmdbTitleUrl(title)
  if (!url) return null
  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(url)
      setMessage('TMDB link copied.'); setFallback(false)
    } catch { setFallback(true); setMessage('Copy the link from the field below.') }
  }
  return <div className="share-title"><button className="text-button" onClick={copy}>Copy title link ↗</button><span role="status">{message}</span>{fallback && <label>Title link<input readOnly value={url} onFocus={e => e.target.select()}/></label>}</div>
}
