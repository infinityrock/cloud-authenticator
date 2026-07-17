import type { Account, OtpAlgorithm, ParseResult } from '../types'
import { normalizeSecret } from './totp'

type DraftAccount = Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'source'>

const DEFAULTS: DraftAccount = {
  secret: '',
  issuer: '',
  account: '',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  group: '',
  tags: [],
}

function parseAlgorithm(value?: string): OtpAlgorithm {
  const upper = (value || 'SHA1').toUpperCase().replace(/-/g, '')
  if (upper === 'SHA256') return 'SHA256'
  if (upper === 'SHA512') return 'SHA512'
  return 'SHA1'
}

function isBase32(secret: string): boolean {
  return /^[2-7A-Z]+=*$/i.test(normalizeSecret(secret))
}

/** Parse a single otpauth:// URI into account fields. */
export function parseOtpauthUri(uri: string): DraftAccount | null {
  const trimmed = uri.trim()
  if (!trimmed.toLowerCase().startsWith('otpauth://')) return null

  try {
    const withoutScheme = trimmed.slice('otpauth://'.length)
    const type = withoutScheme.slice(0, withoutScheme.indexOf('/')).toLowerCase()
    if (type !== 'totp' && type !== 'hotp') {
      // Authenticator Extension also uses hex/hhex; treat hex as totp with base32 later
      if (type !== 'hex') return null
    }

    const rest = withoutScheme.slice(withoutScheme.indexOf('/') + 1)
    const qIndex = rest.indexOf('?')
    if (qIndex === -1) return null

    let label = rest.slice(0, qIndex)
    const query = rest.slice(qIndex + 1)

    try {
      label = decodeURIComponent(label)
    } catch {
      /* keep raw */
    }

    let issuer = ''
    let account = label
    if (label.includes(':')) {
      const [left, ...right] = label.split(':')
      issuer = left.trim()
      account = right.join(':').trim()
    }

    const params = new URLSearchParams(query)
    const secret = params.get('secret') || ''
    if (!secret || !isBase32(secret)) return null

    const issuerParam = params.get('issuer')
    if (issuerParam) {
      try {
        issuer = decodeURIComponent(issuerParam).replace(/\+/g, ' ')
      } catch {
        issuer = issuerParam.replace(/\+/g, ' ')
      }
    }

    const periodRaw = Number(params.get('period') || 30)
    const period =
      !Number.isFinite(periodRaw) || periodRaw <= 0 || periodRaw > 120
        ? 30
        : periodRaw

    const digitsRaw = Number(params.get('digits') || 6)
    const digits = [6, 7, 8].includes(digitsRaw) ? digitsRaw : 6

    return {
      ...DEFAULTS,
      secret: normalizeSecret(secret),
      issuer,
      account,
      algorithm: parseAlgorithm(params.get('algorithm') || undefined),
      digits,
      period,
    }
  } catch {
    return null
  }
}

/**
 * Parse Authenticator Extension JSON backup:
 * { [hash]: { account, issuer, secret, type, algorithm, digits, period, ... } }
 */
export function parseAuthenticatorJson(text: string): ParseResult {
  const accounts: DraftAccount[] = []
  let failed = 0

  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { accounts: [], failed: 1 }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { accounts: [], failed: 1 }
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (key === 'key' || key === 'UserSettings') continue
    if (!value || typeof value !== 'object') continue

    const entry = value as Record<string, unknown>
    if (entry.dataType === 'Key' || entry.dataType === 'EncOTPStorage') {
      failed++
      continue
    }
    if (entry.encrypted === true) {
      failed++
      continue
    }

    const type = String(entry.type || 'totp').toLowerCase()
    if (type === 'hotp' || type === 'hhex' || type === 'battle' || type === 'steam') {
      // HOTP / Steam / Battle not supported in this TOTP-focused app
      failed++
      continue
    }

    const secret = String(entry.secret || '')
    if (!secret || !isBase32(secret)) {
      failed++
      continue
    }

    accounts.push({
      ...DEFAULTS,
      secret: normalizeSecret(secret),
      issuer: String(entry.issuer || ''),
      account: String(entry.account || ''),
      algorithm: parseAlgorithm(
        typeof entry.algorithm === 'string' ? entry.algorithm : undefined,
      ),
      digits: Number(entry.digits) === 8 ? 8 : Number(entry.digits) === 7 ? 7 : 6,
      period: Number(entry.period) > 0 ? Number(entry.period) : 30,
      group: '',
      tags: [],
    })
  }

  return { accounts, failed }
}

/** Parse TXT: one otpauth URI per line (Authenticator Extension export style). */
export function parseOtpauthTxt(text: string): ParseResult {
  const accounts: DraftAccount[] = []
  let failed = 0

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    if (line.toLowerCase().startsWith('otpauth-migration:')) {
      failed++
      continue
    }

    if (line.toLowerCase().startsWith('otpauth:')) {
      const parsed = parseOtpauthUri(line)
      if (parsed) accounts.push(parsed)
      else failed++
      continue
    }

    // Skip non-otpauth lines (JSON blobs handled separately)
    if (line.startsWith('{') || line.startsWith('[')) continue
  }

  return { accounts, failed }
}

/** Auto-detect JSON backup vs otpauth-per-line TXT. */
export function parseImportContent(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { accounts: [], failed: 0 }

  if (trimmed.startsWith('{')) {
    const jsonResult = parseAuthenticatorJson(trimmed)
    if (jsonResult.accounts.length > 0 || jsonResult.failed > 0) {
      return jsonResult
    }
  }

  return parseOtpauthTxt(trimmed)
}
