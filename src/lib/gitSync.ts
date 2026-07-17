import type { Account, SyncResult } from '../types'
import { parseImportContent } from './parse'
import { createId } from './storage'
import { normalizeSecret } from './totp'

/**
 * Convert common GitHub / GitLab blob URLs to raw content URLs.
 * Also accepts already-raw URLs and any direct TXT URL.
 */
export function toRawContentUrl(input: string): string {
  const url = input.trim()
  if (!url) return url

  // github.com/owner/repo/blob/branch/path -> raw.githubusercontent.com/owner/repo/branch/path
  const githubBlob =
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i.exec(
      url,
    )
  if (githubBlob) {
    const [, owner, repo, branch, path] = githubBlob
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  }

  // gist.github.com/... or gist raw
  const gist =
    /^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)(?:\/raw)?/i.exec(url)
  if (gist) {
    const [, user, id] = gist
    return `https://gist.githubusercontent.com/${user}/${id}/raw`
  }

  // gitlab.com/group/project/-/blob/branch/path
  const gitlabBlob =
    /^https?:\/\/(?:www\.)?gitlab\.com\/(.+)\/-\/blob\/([^/]+)\/(.+)$/i.exec(url)
  if (gitlabBlob) {
    const [, project, branch, path] = gitlabBlob
    return `https://gitlab.com/${project}/-/raw/${branch}/${path}`
  }

  return url
}

export async function fetchGitTxt(
  url: string,
  token?: string,
): Promise<string> {
  const rawUrl = toRawContentUrl(url)
  if (!rawUrl) throw new Error('Enter a Git raw URL or GitHub/GitLab blob URL')

  const headers: HeadersInit = {
    Accept: 'text/plain, application/json, */*',
  }
  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`
  }

  const response = await fetch(rawUrl, { headers, cache: 'no-store' })
  if (!response.ok) {
    throw new Error(
      `Fetch failed (${response.status}). For private repos, add a token with contents:read.`,
    )
  }
  return response.text()
}

export function mergeAccountsFromImport(
  existing: Account[],
  text: string,
  source: Account['source'] = 'git',
): { accounts: Account[]; result: SyncResult } {
  const parsed = parseImportContent(text)
  const bySecret = new Map(
    existing.map((a) => [normalizeSecret(a.secret), a] as const),
  )

  let added = 0
  let updated = 0
  const now = Date.now()
  const next = [...existing]

  for (const draft of parsed.accounts) {
    const key = normalizeSecret(draft.secret)
    const found = bySecret.get(key)
    if (found) {
      const idx = next.findIndex((a) => a.id === found.id)
      if (idx === -1) continue
      const prev = next[idx]
      const changed =
        prev.issuer !== draft.issuer ||
        prev.account !== draft.account ||
        prev.algorithm !== draft.algorithm ||
        prev.digits !== draft.digits ||
        prev.period !== draft.period

      if (changed) {
        next[idx] = {
          ...prev,
          issuer: draft.issuer,
          account: draft.account,
          algorithm: draft.algorithm,
          digits: draft.digits,
          period: draft.period,
          updatedAt: now,
          source,
        }
        updated++
      }
    } else {
      const account: Account = {
        ...draft,
        id: createId(),
        source,
        createdAt: now,
        updatedAt: now,
      }
      next.push(account)
      bySecret.set(key, account)
      added++
    }
  }

  return {
    accounts: next,
    result: {
      added,
      updated,
      skipped: 0,
      failed: parsed.failed,
    },
  }
}
