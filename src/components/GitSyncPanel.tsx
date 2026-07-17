import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  gitUrl: string
  gitToken: string
  lastGitSync: number | null
  onSaveConfig: (gitUrl: string, gitToken: string) => void
  onSync: (gitUrl: string, gitToken: string) => Promise<void>
}

export function GitSyncPanel({
  open,
  onClose,
  gitUrl,
  gitToken,
  lastGitSync,
  onSaveConfig,
  onSync,
}: Props) {
  const [url, setUrl] = useState(gitUrl)
  const [token, setToken] = useState(gitToken)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setUrl(gitUrl)
      setToken(gitToken)
    }
  }, [open, gitUrl, gitToken])

  if (!open) return null

  async function sync() {
    setBusy(true)
    try {
      await onSync(url, token)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Git TXT sync"
      >
        <header className="drawer__header">
          <h2>Git TXT sync</h2>
          <button type="button" className="btn btn--icon" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="form">
          <p className="drawer__hint">
            Point at a raw <code>.txt</code> of otpauth URIs (one per line), or
            an Authenticator Extension JSON backup. GitHub/GitLab blob URLs are
            converted to raw automatically.
          </p>
          <label>
            Repo file URL
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/you/secrets/blob/main/authenticator.txt"
              spellCheck={false}
            />
          </label>
          <label>
            Access token (optional, private repos)
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… stored only in localStorage"
              autoComplete="off"
            />
          </label>
          {lastGitSync ? (
            <p className="drawer__meta">
              Last sync: {new Date(lastGitSync).toLocaleString()}
            </p>
          ) : null}
          <div className="form__actions">
            <button
              type="button"
              className="btn"
              onClick={() => onSaveConfig(url, token)}
            >
              Save URL
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy || !url.trim()}
              onClick={() => void sync()}
            >
              {busy ? 'Fetching…' : 'Fetch & merge'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
