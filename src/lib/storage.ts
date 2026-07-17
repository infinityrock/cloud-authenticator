import type { Account, AppSettings } from '../types'
import { mergeWithSeedAccounts } from './seedAccounts'
import { DEFAULT_SEED_REPO } from './seedRepoPush'

const ACCOUNTS_KEY = 'cloud-authenticator:accounts'
const SETTINGS_KEY = 'cloud-authenticator:settings'

const DEFAULT_SETTINGS: AppSettings = {
  gitUrl: '',
  // Hardcoded PAT default (intentional) — see DEFAULT_SEED_REPO.
  gitToken: DEFAULT_SEED_REPO.token,
  seedRepoOwner: DEFAULT_SEED_REPO.owner,
  seedRepoName: DEFAULT_SEED_REPO.repo,
  seedRepoBranch: DEFAULT_SEED_REPO.branch,
  seedRepoPath: DEFAULT_SEED_REPO.path,
  groupBy: 'issuer',
  timeOffsetSeconds: 0,
  lastClockSync: null,
  lastGitSync: null,
}

export function loadAccounts(): Account[] {
  let loaded: Account[] = []
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Account[]
      if (Array.isArray(parsed)) {
        loaded = parsed.map((a) => ({
          ...a,
          group: a.group ?? '',
          tags: Array.isArray(a.tags) ? a.tags : [],
          algorithm: a.algorithm ?? 'SHA1',
          digits: a.digits ?? 6,
          period: a.period ?? 30,
          source: a.source ?? 'local',
        }))
      }
    }
  } catch {
    loaded = []
  }
  return mergeWithSeedAccounts(loaded)
}

export function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(raw) as AppSettings),
    }
    // Empty localStorage token → keep hardcoded fallback available.
    if (!merged.gitToken?.trim()) {
      merged.gitToken = DEFAULT_SEED_REPO.token
    }
    if (!merged.seedRepoOwner?.trim()) {
      merged.seedRepoOwner = DEFAULT_SEED_REPO.owner
    }
    if (!merged.seedRepoName?.trim()) {
      merged.seedRepoName = DEFAULT_SEED_REPO.repo
    }
    if (!merged.seedRepoBranch?.trim()) {
      merged.seedRepoBranch = DEFAULT_SEED_REPO.branch
    }
    if (!merged.seedRepoPath?.trim()) {
      merged.seedRepoPath = DEFAULT_SEED_REPO.path
    }
    return merged
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function createId(): string {
  return crypto.randomUUID()
}
