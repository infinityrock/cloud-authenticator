import type { AppSettings, OtpAlgorithm } from '../types'
import { normalizeSecret } from './totp'

/**
 * Hardcoded defaults (intentional per user request) so Add Secret can push
 * to seedAccounts.ts without any UI configuration. Token is public in the
 * JS bundle — rotate if compromised.
 */
export const DEFAULT_SEED_REPO = {
  owner: 'infinityrock',
  repo: 'cloud-authenticator',
  branch: 'main',
  path: 'src/lib/seedAccounts.ts',
  token: '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',
} as const

export type SeedRepoConfig = {
  owner: string
  repo: string
  branch: string
  path: string
  token: string
}

/** Merge settings with hardcoded defaults; empty token always falls back. */
export function resolveSeedRepoConfig(
  settings: Pick<
    AppSettings,
    'gitToken' | 'seedRepoOwner' | 'seedRepoName' | 'seedRepoBranch' | 'seedRepoPath'
  >,
): SeedRepoConfig {
  return {
    token: settings.gitToken.trim() || DEFAULT_SEED_REPO.token,
    owner: settings.seedRepoOwner.trim() || DEFAULT_SEED_REPO.owner,
    repo: settings.seedRepoName.trim() || DEFAULT_SEED_REPO.repo,
    branch: settings.seedRepoBranch.trim() || DEFAULT_SEED_REPO.branch,
    path: settings.seedRepoPath.trim() || DEFAULT_SEED_REPO.path,
  }
}

export type PushSeedResult =
  | { ok: true; skipped: true; reason: 'exists' }
  | {
      ok: true
      skipped: false
      commitSha: string
      commitUrl: string | null
      htmlUrl: string | null
    }
  | { ok: false; error: string }

type AccountFields = {
  secret: string
  issuer: string
  account: string
  algorithm: OtpAlgorithm
  digits: number
  period: number
}

/** Build an otpauth URI matching the style used in seedAccounts.ts. */
export function buildSeedOtpauthUri(fields: AccountFields): string {
  const secret = normalizeSecret(fields.secret)
  const issuer = fields.issuer.trim()
  const account = fields.account.trim()
  const labelAccount = encodeURIComponent(account)
  const label = issuer ? `${issuer}:${labelAccount}` : labelAccount

  const params = new URLSearchParams()
  params.set('secret', secret)
  if (issuer) params.set('issuer', issuer)
  if (fields.algorithm !== 'SHA1') {
    params.set('algorithm', fields.algorithm)
  }
  if (fields.digits !== 6) params.set('digits', String(fields.digits))
  if (fields.period !== 30) params.set('period', String(fields.period))

  return `otpauth://totp/${label}?${params.toString()}`
}

function extractSecretFromUri(uri: string): string | null {
  const match = /[?&]secret=([^&]+)/i.exec(uri)
  return match ? normalizeSecret(decodeURIComponent(match[1])) : null
}

function listSeedUris(content: string): string[] {
  const uris: string[] = []
  const re = /'(otpauth:\/\/[^']+)'/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    uris.push(m[1])
  }
  return uris
}

/**
 * Append a URI to the SEED_URIS array, preserving TypeScript formatting.
 * Skips when the same URI or the same secret already exists.
 */
export function appendUriToSeedFile(
  content: string,
  uri: string,
): { content: string; status: 'added' | 'exists' } {
  const existing = listSeedUris(content)
  if (existing.includes(uri)) {
    return { content, status: 'exists' }
  }

  const newSecret = extractSecretFromUri(uri)
  if (newSecret) {
    for (const e of existing) {
      if (extractSecretFromUri(e) === newSecret) {
        return { content, status: 'exists' }
      }
    }
  }

  const marker = '] as const'
  const idx = content.indexOf(marker)
  if (idx === -1) {
    throw new Error('Could not find SEED_URIS array ("] as const") in seedAccounts.ts')
  }

  // Insert immediately before "] as const", keeping 2-space indent and trailing comma.
  const escaped = uri.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const line = `  '${escaped}',\n`
  return {
    content: content.slice(0, idx) + line + content.slice(idx),
    status: 'added',
  }
}

function b64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64DecodeUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

type GitHubContentResponse = {
  sha: string
  content?: string
  encoding?: string
  html_url?: string
  commit?: { sha?: string; html_url?: string }
}

async function githubContents(
  method: 'GET' | 'PUT',
  config: SeedRepoConfig,
  body?: unknown,
): Promise<GitHubContentResponse> {
  const path = config.path.replace(/^\/+/, '')
  const url = new URL(
    `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
  )
  if (method === 'GET') {
    url.searchParams.set('ref', config.branch)
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token.trim()}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({}))) as GitHubContentResponse & {
    message?: string
  }

  if (!response.ok) {
    const msg = data.message || `GitHub API ${response.status}`
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `${msg}. Check that your PAT has Contents write access to ${config.owner}/${config.repo}.`,
      )
    }
    if (response.status === 404) {
      throw new Error(
        `${msg}. Repo, branch, or path not found — or the token lacks access.`,
      )
    }
    throw new Error(msg)
  }

  return data
}

/**
 * GET seedAccounts.ts, append the URI if missing, PUT a commit.
 * Uses the GitHub Contents API (CORS-friendly for authenticated browser requests).
 */
export async function pushSeedUriToRepo(
  config: SeedRepoConfig,
  fields: AccountFields,
): Promise<PushSeedResult> {
  const token = config.token.trim()
  if (!token) {
    return { ok: false, error: 'GitHub token is required to save to the repo' }
  }
  if (!config.owner.trim() || !config.repo.trim()) {
    return { ok: false, error: 'Owner and repo are required' }
  }

  try {
    const uri = buildSeedOtpauthUri(fields)
    const file = await githubContents('GET', config)
    if (!file.content || !file.sha) {
      return { ok: false, error: 'GitHub did not return file content/sha' }
    }

    const current = b64DecodeUtf8(file.content)
    const { content: next, status } = appendUriToSeedFile(current, uri)
    if (status === 'exists') {
      return { ok: true, skipped: true, reason: 'exists' }
    }

    const label = [fields.issuer.trim(), fields.account.trim()]
      .filter(Boolean)
      .join(' / ')
    const message = `Add TOTP seed: ${label || 'new account'}`

    const updated = await githubContents('PUT', config, {
      message,
      content: b64EncodeUtf8(next),
      sha: file.sha,
      branch: config.branch || 'main',
    })

    return {
      ok: true,
      skipped: false,
      commitSha: updated.commit?.sha || '',
      commitUrl: updated.commit?.html_url ?? null,
      htmlUrl: updated.html_url ?? null,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to push seed to repo',
    }
  }
}
