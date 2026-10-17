export default function UndoToast({ action, onUndo, onDismiss, disabled }) {
  if (!action) return null
  return <aside className="undo-toast" aria-label="Last library action"><span role="status">{action.label}</span><button disabled={disabled} onClick={onUndo}>Undo</button><button onClick={onDismiss} aria-label="Dismiss undo notification">×</button></aside>
}
