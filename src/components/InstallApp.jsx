import { useEffect, useState } from 'react'

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean(navigator.standalone))
  const [help, setHelp] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    function ready(event) { event.preventDefault(); setPrompt(event) }
    function done() { setInstalled(true); setPrompt(null) }
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', done)
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done) }
  }, [])
  async function install() {
    if (!prompt) { setHelp(value => !value); return }
    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      setMessage(choice.outcome === 'accepted' ? 'Installation requested.' : 'You can install later from the browser menu.')
      setPrompt(null)
    } catch { setHelp(true); setPrompt(null) }
  }
  return <div className="install-control">{installed ? <span>Running as an app</span> : <button className="secondary" onClick={install}>{prompt ? 'Install WatchPick' : 'Add to home screen'}</button>}{help && <p className="feature-note">Use your browser menu → Install app / Add to Home Screen. On iPhone, open in Safari and use Share → Add to Home Screen. Installation and offline caching require a production build over HTTPS or localhost and an initial online visit.</p>}{message && <p className="feature-note" role="status">{message}</p>}</div>
}
