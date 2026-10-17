import { useEffect, useState } from 'react'

export default function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])
  return online ? null : <div className="offline-banner" role="status">You’re offline. Your saved library is available; new TMDB searches and recommendations need a connection. Only previously cached posters may appear.</div>
}
