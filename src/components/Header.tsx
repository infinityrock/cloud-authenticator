type Props = {
  accountCount: number
  offsetSeconds: number
  lastClockSync: number | null
  onSyncClock: () => void
  syncing?: boolean
}

export function Header({
  accountCount,
  offsetSeconds,
  lastClockSync,
  onSyncClock,
  syncing,
}: Props) {
  return (
    <header className="hero">
      <div className="hero__glow" aria-hidden />
      <div className="hero__content">
        <p className="hero__eyebrow">Desktop TOTP</p>
        <h1 className="hero__brand">Cloud Authenticator</h1>
        <p className="hero__lede">
          Live two-factor codes with Git TXT sync, local secrets, and network
          clock correction.
        </p>
        <div className="hero__meta">
          <span>
            {accountCount} account{accountCount === 1 ? '' : 's'}
          </span>
          <span className="dot" aria-hidden />
          <span>
            Offset {offsetSeconds > 0 ? '+' : ''}
            {offsetSeconds}s
            {lastClockSync
              ? ` · synced ${new Date(lastClockSync).toLocaleTimeString()}`
              : ''}
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onSyncClock}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync clock'}
          </button>
        </div>
      </div>
    </header>
  )
}
