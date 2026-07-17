import { useEffect, useState } from 'react'

type SeedRepoFields = {
  owner: string
  repo: string
  branch: string
  path: string
}

type Props = {
  open: boolean
  onClose: () => void
  gitUrl: string
  gitToken: string
  lastGitSync: number | null
  seedRepo: SeedRepoFields
  onSaveConfig: (config: {
    gitUrl: string
    gitToken: string
    seedRepoOwner: string
    seedRepoName: string
    seedRepoBranch: string
    seedRepoPath: string
  }) => void
  onSync: (gitUrl: string, gitToken: string) => Promise<void>
}

export function GitSyncPanel({
  open,
  onClose,
  gitUrl,
  gitToken,
  lastGitSync,
  seedRepo,
  onSaveConfig,
  onSync,
}: Props) {
  const [url, setUrl] = useState(gitUrl)
  const [token, setToken] = useState(gitToken)
  const [owner, setOwner] = useState(seedRepo.owner)
  const [repo, setRepo] = useState(seedRepo.repo)
  const [branch, setBranch] = useState(seedRepo.branch)
  const [path, setPath] = useState(seedRepo.path)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setUrl(gitUrl)
      setToken(gitToken)
      setOwner(seedRepo.owner)
      setRepo(seedRepo.repo)
      setBranch(seedRepo.branch)
      setPath(seedRepo.path)
    }
  }, [open, gitUrl, gitToken, seedRepo])

  if (!open) return null

  function saveConfig() {
    onSaveConfig({
      gitUrl: url,
      gitToken: token,
      seedRepoOwner: owner.trim() || 'infinityrock',
      seedRepoName: repo.trim() || 'cloud-authenticator',
      seedRepoBranch: branch.trim() || 'main',
      seedRepoPath: path.trim() || 'src/lib/seedAccounts.ts',
    })
  }

  async function sync() {
    setBusy(true)
    try {
      saveConfig()
      await onSync(url, token)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="drawer drawer--wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Git sync & seed repo"
      >
        <header className="drawer__header">
          <h2>Git sync</h2>
          <button type="button" className="btn btn--icon" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="form">
          <p className="drawer__hint">
            Token and settings are stored only in this browser&apos;s{' '}
            <code>localStorage</code> — never committed to the repo. Prefer a
            fine-grained PAT with Contents read/write on this repository only.
          </p>

          <label>
            Access token (PAT)
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_… or github_pat_…"
              autoComplete="off"
            />
          </label>

          <h3 className="drawer__section">Save new secrets to seedAccounts.ts</h3>
          <p className="drawer__hint">
            When adding a secret with &quot;Also save to repo&quot;, the app
            appends an otpauth URI to this file via the GitHub Contents API and
            commits — which triggers the Pages deploy.
          </p>
          <div className="form__row">
            <label>
              Owner
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="infinityrock"
                spellCheck={false}
              />
            </label>
            <label>
              Repo
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="cloud-authenticator"
                spellCheck={false}
              />
            </label>
          </div>
          <div className="form__row">
            <label>
              Branch
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                spellCheck={false}
              />
            </label>
            <label>
              Path
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="src/lib/seedAccounts.ts"
                spellCheck={false}
              />
            </label>
          </div>

          <h3 className="drawer__section">Optional: fetch TXT / JSON backup</h3>
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
          {lastGitSync ? (
            <p className="drawer__meta">
              Last sync: {new Date(lastGitSync).toLocaleString()}
            </p>
          ) : null}
          <div className="form__actions">
            <button type="button" className="btn" onClick={saveConfig}>
              Save settings
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
