import { useEffect, useState, type FormEvent } from 'react'
import type { OtpAlgorithm } from '../types'

export type AddAccountInput = {
  secret: string
  issuer: string
  account: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
  group: string
  tags: string
  pushToRepo: boolean
}

type Props = {
  open: boolean
  onClose: () => void
  /** True when a GitHub token is configured (enables default push-to-repo). */
  hasRepoToken: boolean
  onAdd: (input: AddAccountInput) => boolean | Promise<boolean>
}

const empty = {
  secret: '',
  issuer: '',
  account: '',
  algorithm: 'SHA1' as OtpAlgorithm,
  digits: 6,
  period: 30,
  group: '',
  tags: '',
}

export function AddAccountPanel({
  open,
  onClose,
  hasRepoToken,
  onAdd,
}: Props) {
  const [form, setForm] = useState(empty)
  const [pushToRepo, setPushToRepo] = useState(hasRepoToken)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setPushToRepo(hasRepoToken)
    }
  }, [open, hasRepoToken])

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const ok = await onAdd({ ...form, pushToRepo })
      if (ok) {
        setForm(empty)
        onClose()
      }
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
        aria-label="Add secret"
      >
        <header className="drawer__header">
          <h2>Add secret</h2>
          <button type="button" className="btn btn--icon" onClick={onClose}>
            ×
          </button>
        </header>
        <form className="form" onSubmit={(e) => void submit(e)}>
          <label>
            Secret (Base32)
            <input
              required
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder="JBSWY3DPEHPK3PXP"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label>
            Issuer
            <input
              value={form.issuer}
              onChange={(e) => setForm({ ...form, issuer: e.target.value })}
              placeholder="GitHub"
            />
          </label>
          <label>
            Account
            <input
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
              placeholder="you@example.com"
            />
          </label>
          <div className="form__row">
            <label>
              Algorithm
              <select
                value={form.algorithm}
                onChange={(e) =>
                  setForm({
                    ...form,
                    algorithm: e.target.value as OtpAlgorithm,
                  })
                }
              >
                <option value="SHA1">SHA1</option>
                <option value="SHA256">SHA256</option>
                <option value="SHA512">SHA512</option>
              </select>
            </label>
            <label>
              Digits
              <select
                value={form.digits}
                onChange={(e) =>
                  setForm({ ...form, digits: Number(e.target.value) })
                }
              >
                <option value={6}>6</option>
                <option value={7}>7</option>
                <option value={8}>8</option>
              </select>
            </label>
            <label>
              Period (s)
              <input
                type="number"
                min={10}
                max={120}
                value={form.period}
                onChange={(e) =>
                  setForm({ ...form, period: Number(e.target.value) || 30 })
                }
              />
            </label>
          </div>
          <label>
            Custom group
            <input
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value })}
              placeholder="Work"
            />
          </label>
          <label>
            Tags
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="cloud, personal"
            />
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={pushToRepo}
              onChange={(e) => setPushToRepo(e.target.checked)}
              disabled={!hasRepoToken}
            />
            <span>
              Also save to repo (<code>seedAccounts.ts</code>)
              {!hasRepoToken ? (
                <span className="checkbox-field__hint">
                  {' '}
                  — set a GitHub token in Git sync first
                </span>
              ) : null}
            </span>
          </label>

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={busy}
          >
            {busy
              ? pushToRepo
                ? 'Adding & pushing…'
                : 'Saving…'
              : pushToRepo
                ? 'Add & push to repo'
                : 'Save account'}
          </button>
        </form>
      </aside>
    </div>
  )
}
