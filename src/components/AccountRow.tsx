import { useState } from 'react'
import type { Account } from '../types'
import { formatCode, generateCode, getPeriodProgress } from '../lib/totp'
import { useNow } from '../hooks/useNow'

type Props = {
  account: Account
  offsetSeconds: number
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Account>) => void
}

export function AccountRow({
  account,
  offsetSeconds,
  onDelete,
  onUpdate,
}: Props) {
  useNow(250)
  const code = generateCode(account, offsetSeconds)
  const { remaining, progress } = getPeriodProgress(
    account.period,
    offsetSeconds,
  )
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [group, setGroup] = useState(account.group)
  const [tags, setTags] = useState(account.tags.join(', '))

  const urgent = remaining <= 5

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code.replace(/\s/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  function saveMeta() {
    onUpdate(account.id, {
      group: group.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
    setEditing(false)
  }

  const title = account.issuer || account.account || 'Untitled'
  const subtitle =
    account.issuer && account.account
      ? account.account
      : account.issuer
        ? ''
        : account.account

  return (
    <article className={`account-row${urgent ? ' account-row--urgent' : ''}`}>
      <div
        className="account-row__ring"
        style={{
          background: `conic-gradient(var(--accent) ${progress * 360}deg, transparent 0)`,
        }}
        aria-hidden
      >
        <span>{remaining}</span>
      </div>

      <div className="account-row__info">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        <div className="account-row__chips">
          {account.group ? <span className="chip">{account.group}</span> : null}
          {account.tags.map((tag) => (
            <span key={tag} className="chip chip--muted">
              {tag}
            </span>
          ))}
          <span className="chip chip--muted">{account.source}</span>
        </div>
      </div>

      <button
        type="button"
        className="account-row__code"
        onClick={() => void copyCode()}
        title="Copy code"
      >
        <span className="code">{formatCode(code)}</span>
        <span className="copy-hint">{copied ? 'Copied' : 'Copy'}</span>
      </button>

      <div className="account-row__menu">
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => setEditing((v) => !v)}
          aria-label="Edit group and tags"
        >
          ✎
        </button>
        <button
          type="button"
          className="btn btn--icon btn--danger"
          onClick={() => {
            if (window.confirm(`Remove ${title}?`)) onDelete(account.id)
          }}
          aria-label="Delete account"
        >
          ×
        </button>
      </div>

      {editing ? (
        <div className="account-row__edit">
          <label>
            Custom group
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g. Work"
            />
          </label>
          <label>
            Tags (comma-separated)
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. finance, personal"
            />
          </label>
          <button type="button" className="btn btn--primary" onClick={saveMeta}>
            Save
          </button>
        </div>
      ) : null}
    </article>
  )
}
