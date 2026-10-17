import { useState } from 'react'
import Icon from './Icon'

export default function Poster({ title, className = '' }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!title.poster || failed) {
    return <div className={`poster poster-fallback ${className}`}>
      <Icon name="film" size={40}/>
      <span>{title.title}</span>
      <small>Poster unavailable</small>
    </div>
  }

  return <img
    className={`poster ${loaded ? 'poster-loaded' : 'poster-loading'} ${className}`}
    src={title.poster}
    alt={`${title.title} poster`}
    decoding="async"
    onLoad={() => setLoaded(true)}
    onError={() => setFailed(true)}
  />
}
