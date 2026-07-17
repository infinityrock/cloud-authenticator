import { useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  onImport: (text: string) => void
}

export function ImportPanel({ open, onClose, onImport }: Props) {
  const [text, setText] = useState('')

  if (!open) return null

  function submit() {
    if (!text.trim()) return
    onImport(text)
    setText('')
    onClose()
  }

  function onFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
    }
    reader.readAsText(file)
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="drawer drawer--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Import backup"
      >
        <header className="drawer__header">
          <h2>Import backup</h2>
          <button type="button" className="btn btn--icon" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="form">
          <p className="drawer__hint">
            Paste otpauth URIs (one per line) or Authenticator Extension JSON.
            Encrypted backups and HOTP/Steam entries are skipped.
          </p>
          <label className="file-field">
            <span>Or choose a .txt / .json file</span>
            <input
              type="file"
              accept=".txt,.json,text/plain,application/json"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <label>
            Backup contents
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                'otpauth://totp/GitHub:you?secret=JBSWY3DPEHPK3PXP&issuer=GitHub'
              }
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!text.trim()}
            onClick={submit}
          >
            Merge into local list
          </button>
        </div>
      </aside>
    </div>
  )
}
