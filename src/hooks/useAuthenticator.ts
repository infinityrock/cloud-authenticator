import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Account, AppSettings, GroupBy, OtpAlgorithm } from '../types'
import { mergeAccountsFromImport, fetchGitTxt } from '../lib/gitSync'
import {
  createId,
  loadAccounts,
  loadSettings,
  saveAccounts,
  saveSettings,
} from '../lib/storage'
import { normalizeSecret } from '../lib/totp'
import { syncClockWithGoogle } from '../lib/timeSync'

export function useAuthenticator() {
  const [accounts, setAccounts] = useState<Account[]>(() => loadAccounts())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [filter, setFilter] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    saveAccounts(accounts)
  }, [accounts])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const flash = useCallback((msg: string) => {
    setStatusMessage(msg)
    window.setTimeout(() => setStatusMessage(null), 4000)
  }, [])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const addAccount = useCallback(
    (input: {
      secret: string
      issuer: string
      account: string
      algorithm: OtpAlgorithm
      digits: number
      period: number
      group: string
      tags: string
    }) => {
      const secret = normalizeSecret(input.secret)
      if (!secret) {
        flash('Secret is required')
        return false
      }
      if (accounts.some((a) => normalizeSecret(a.secret) === secret)) {
        flash('An account with this secret already exists')
        return false
      }

      const now = Date.now()
      const tags = input.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      setAccounts((prev) => [
        ...prev,
        {
          id: createId(),
          secret,
          issuer: input.issuer.trim(),
          account: input.account.trim(),
          algorithm: input.algorithm,
          digits: input.digits,
          period: input.period,
          group: input.group.trim(),
          tags,
          source: 'local',
          createdAt: now,
          updatedAt: now,
        },
      ])
      flash('Account added')
      return true
    },
    [accounts, flash],
  )

  const updateAccount = useCallback(
    (id: string, patch: Partial<Account>) => {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
        ),
      )
    },
    [],
  )

  const deleteAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      flash('Account removed')
    },
    [flash],
  )

  const importText = useCallback(
    (text: string, source: Account['source'] = 'import') => {
      const { accounts: next, result } = mergeAccountsFromImport(
        accounts,
        text,
        source,
      )
      setAccounts(next)
      flash(
        `Imported +${result.added} · updated ${result.updated}` +
          (result.failed ? ` · ${result.failed} skipped` : ''),
      )
      return result
    },
    [accounts, flash],
  )

  const syncFromGit = useCallback(
    async (override?: { gitUrl?: string; gitToken?: string }) => {
      const gitUrl = (override?.gitUrl ?? settings.gitUrl).trim()
      const gitToken = override?.gitToken ?? settings.gitToken
      if (!gitUrl) {
        flash('Configure a Git TXT URL first')
        return
      }
      try {
        const text = await fetchGitTxt(gitUrl, gitToken)
        const { accounts: next, result } = mergeAccountsFromImport(
          accounts,
          text,
          'git',
        )
        setAccounts(next)
        updateSettings({
          gitUrl,
          gitToken,
          lastGitSync: Date.now(),
        })
        flash(
          `Git sync: +${result.added} · updated ${result.updated}` +
            (result.failed ? ` · ${result.failed} failed` : ''),
        )
      } catch (error) {
        flash(error instanceof Error ? error.message : 'Git sync failed')
      }
    },
    [accounts, flash, settings.gitToken, settings.gitUrl, updateSettings],
  )

  const syncClock = useCallback(async () => {
    const result = await syncClockWithGoogle()
    if (result.ok) {
      updateSettings({
        timeOffsetSeconds: result.offsetSeconds,
        lastClockSync: Date.now(),
      })
      flash(
        result.offsetSeconds === 0
          ? `Clock in sync (${result.source})`
          : `Clock offset set to ${result.offsetSeconds > 0 ? '+' : ''}${result.offsetSeconds}s (${result.source})`,
      )
    } else if (result.reason === 'clock_too_far_off') {
      flash('System clock is more than 5 minutes off — fix OS time first')
    } else {
      flash('Could not sync clock — check your network connection')
    }
  }, [flash, updateSettings])

  const setGroupBy = useCallback(
    (groupBy: GroupBy) => updateSettings({ groupBy }),
    [updateSettings],
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((a) => {
      const hay = [
        a.issuer,
        a.account,
        a.group,
        ...a.tags,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [accounts, filter])

  const grouped = useMemo(() => {
    const mode = settings.groupBy
    if (mode === 'none') {
      return [{ key: 'All accounts', items: filtered }]
    }

    const map = new Map<string, Account[]>()
    for (const account of filtered) {
      let keys: string[] = []
      if (mode === 'issuer') {
        keys = [account.issuer || 'No issuer']
      } else if (mode === 'group') {
        keys = [account.group || 'Ungrouped']
      } else if (mode === 'tag') {
        keys = account.tags.length > 0 ? account.tags : ['Untagged']
      }
      for (const key of keys) {
        const list = map.get(key) ?? []
        list.push(account)
        map.set(key, list)
      }
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }))
  }, [filtered, settings.groupBy])

  return {
    accounts,
    settings,
    filter,
    setFilter,
    statusMessage,
    grouped,
    addAccount,
    updateAccount,
    deleteAccount,
    importText,
    syncFromGit,
    syncClock,
    setGroupBy,
    updateSettings,
  }
}
