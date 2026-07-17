import { useState } from 'react'
import { Header } from './components/Header'
import { Toolbar } from './components/Toolbar'
import { AccountList } from './components/AccountList'
import { AddAccountPanel } from './components/AddAccountPanel'
import { GitSyncPanel } from './components/GitSyncPanel'
import { ImportPanel } from './components/ImportPanel'
import { useAuthenticator } from './hooks/useAuthenticator'
import './App.css'

type Panel = 'add' | 'git' | 'import' | null

export default function App() {
  const auth = useAuthenticator()
  const [panel, setPanel] = useState<Panel>(null)
  const [clockBusy, setClockBusy] = useState(false)

  async function handleClockSync() {
    setClockBusy(true)
    try {
      await auth.syncClock()
    } finally {
      setClockBusy(false)
    }
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden>
        <div className="atmosphere__wash" />
        <div className="atmosphere__orb atmosphere__orb--a" />
        <div className="atmosphere__orb atmosphere__orb--b" />
        <div className="atmosphere__grid" />
      </div>

      <div className="shell">
        <Header
          accountCount={auth.accounts.length}
          offsetSeconds={auth.settings.timeOffsetSeconds}
          lastClockSync={auth.settings.lastClockSync}
          onSyncClock={() => void handleClockSync()}
          syncing={clockBusy}
        />

        <Toolbar
          filter={auth.filter}
          onFilterChange={auth.setFilter}
          groupBy={auth.settings.groupBy}
          onGroupByChange={auth.setGroupBy}
          onOpenAdd={() => setPanel('add')}
          onOpenGit={() => setPanel('git')}
          onOpenImport={() => setPanel('import')}
        />

        {auth.statusMessage ? (
          <div className="toast" role="status">
            {auth.statusMessage}
          </div>
        ) : null}

        <main>
          <AccountList
            groups={auth.grouped}
            offsetSeconds={auth.settings.timeOffsetSeconds}
            onDelete={auth.deleteAccount}
            onUpdate={auth.updateAccount}
          />
        </main>

        <footer className="footer">
          <p>
            Secrets stay in this browser&apos;s localStorage. Compatible with
            Authenticator Extension otpauth TXT and unencrypted JSON exports.
          </p>
        </footer>
      </div>

      <AddAccountPanel
        open={panel === 'add'}
        onClose={() => setPanel(null)}
        onAdd={auth.addAccount}
      />

      <GitSyncPanel
        open={panel === 'git'}
        onClose={() => setPanel(null)}
        gitUrl={auth.settings.gitUrl}
        gitToken={auth.settings.gitToken}
        lastGitSync={auth.settings.lastGitSync}
        onSaveConfig={(gitUrl, gitToken) =>
          auth.updateSettings({ gitUrl, gitToken })
        }
        onSync={async (gitUrl, gitToken) => {
          await auth.syncFromGit({ gitUrl, gitToken })
        }}
      />

      <ImportPanel
        open={panel === 'import'}
        onClose={() => setPanel(null)}
        onImport={(text) => auth.importText(text, 'import')}
      />
    </div>
  )
}
