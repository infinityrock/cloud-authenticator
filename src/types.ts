export type OtpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512'

export type GroupBy = 'none' | 'issuer' | 'group' | 'tag'

export type AccountSource = 'local' | 'git' | 'import' | 'seed'

export interface Account {
  id: string
  secret: string
  issuer: string
  account: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
  group: string
  tags: string[]
  source: AccountSource
  createdAt: number
  updatedAt: number
}

export interface AppSettings {
  gitUrl: string
  gitToken: string
  /** GitHub owner for seedAccounts.ts push (Contents API). */
  seedRepoOwner: string
  seedRepoName: string
  seedRepoBranch: string
  seedRepoPath: string
  groupBy: GroupBy
  timeOffsetSeconds: number
  lastClockSync: number | null
  lastGitSync: number | null
}

export type StatusMessage = {
  text: string
  href?: string
  hrefLabel?: string
}

export interface SyncResult {
  added: number
  updated: number
  skipped: number
  failed: number
}

export interface ParseResult {
  accounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'source'>[]
  failed: number
}
