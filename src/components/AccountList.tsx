import type { Account } from '../types'
import { AccountRow } from './AccountRow'

type Props = {
  groups: { key: string; items: Account[] }[]
  offsetSeconds: number
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Account>) => void
}

export function AccountList({
  groups,
  offsetSeconds,
  onDelete,
  onUpdate,
}: Props) {
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  if (total === 0) {
    return (
      <div className="empty">
        <h2>No accounts yet</h2>
        <p>
          Add a secret locally, import an Authenticator Extension backup, or
          sync a TXT file from Git.
        </p>
      </div>
    )
  }

  return (
    <div className="account-list">
      {groups.map((group) => (
        <section key={group.key} className="account-group">
          <h2 className="account-group__title">
            {group.key}
            <span>{group.items.length}</span>
          </h2>
          <div className="account-group__rows">
            {group.items.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                offsetSeconds={offsetSeconds}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
