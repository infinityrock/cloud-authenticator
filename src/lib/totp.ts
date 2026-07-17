import { Secret, TOTP } from 'otpauth'
import type { Account, OtpAlgorithm } from '../types'

const ALGORITHM_MAP: Record<OtpAlgorithm, 'SHA1' | 'SHA256' | 'SHA512'> = {
  SHA1: 'SHA1',
  SHA256: 'SHA256',
  SHA512: 'SHA512',
}

export function normalizeSecret(secret: string): string {
  return secret.replace(/[\s\-]/g, '').toUpperCase()
}

export function createTotp(account: Account): TOTP {
  return new TOTP({
    issuer: account.issuer || undefined,
    label: account.account || 'Account',
    algorithm: ALGORITHM_MAP[account.algorithm] ?? 'SHA1',
    digits: account.digits,
    period: account.period,
    secret: Secret.fromBase32(normalizeSecret(account.secret)),
  })
}

export function getCorrectedNow(offsetSeconds = 0): number {
  return Date.now() + offsetSeconds * 1000
}

export function generateCode(account: Account, offsetSeconds = 0): string {
  try {
    const totp = createTotp(account)
    return totp.generate({ timestamp: getCorrectedNow(offsetSeconds) })
  } catch {
    return '------'
  }
}

export function getPeriodProgress(
  period: number,
  offsetSeconds = 0,
): { remaining: number; progress: number } {
  const now = getCorrectedNow(offsetSeconds)
  const elapsed = Math.floor(now / 1000) % period
  const remaining = period - elapsed
  return { remaining, progress: remaining / period }
}

export function formatCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`
  return code
}
