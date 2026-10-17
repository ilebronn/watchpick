import { useState } from 'react'

export default function FolderManager({ folders, onCreate, onDelete, disabled }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const value = name.trim()
    if (!value) return
    if (folders.some(folder => folder.toLocaleLowerCase() === value.toLocaleLowerCase())) { setError('A collection with this name already exists.'); return }
    onCreate(value); setName(''); setError('')
  }
  return <details className="folder-manager"><summary>Your collections<span>{folders.length}</span></summary><p className="feature-note">Create folders such as Weekend or With friends. Assign titles from “Your notes & rating.” Deleting a collection keeps all titles.</p><form onSubmit={submit}><label>New collection<input value={name} maxLength={40} placeholder="Weekend watchlist" disabled={disabled} onChange={e => setName(e.target.value)}/></label><button className="secondary" disabled={disabled || !name.trim()}>Create collection</button></form>{error && <p className="feature-error" role="alert">{error}</p>}<div className="folder-list">{folders.map(folder => <span key={folder}>{folder}<button disabled={disabled} aria-label={`Delete collection ${folder}`} onClick={() => onDelete(folder)}>×</button></span>)}</div></details>
}
