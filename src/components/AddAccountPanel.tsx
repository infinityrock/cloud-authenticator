import { useState, type FormEvent } from 'react'
import type { OtpAlgorithm } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onAdd: (input: {
    secret: string
    issuer: string
    account: string
    algorithm: OtpAlgorithm
    digits: number
    period: number
    group: string
    tags: string
  }) => boolean
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

export function AddAccountPanel({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState(empty)

  if (!open) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    if (onAdd(form)) {
      setForm(empty)
      onClose()
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
        <form className="form" onSubmit={submit}>
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
          <button type="submit" className="btn btn--primary btn--block">
            Save account
          </button>
        </form>
      </aside>
    </div>
  )
}
