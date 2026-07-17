export type ClockSyncStatus =
  | { ok: true; offsetSeconds: number; serverTime: number; source: string }
  | { ok: false; reason: 'updateFailure' | 'clock_too_far_off' | 'network' }

const MAX_OFFSET_SECONDS = 300

function finish(
  serverTime: number,
  source: string,
): ClockSyncStatus {
  const clientTime = Date.now()
  const offsetSeconds = Math.round((serverTime - clientTime) / 1000)

  if (Math.abs(offsetSeconds) > MAX_OFFSET_SECONDS) {
    return { ok: false, reason: 'clock_too_far_off' }
  }

  return { ok: true, offsetSeconds, serverTime, source }
}

/**
 * Dev/preview: Vite middleware proxies Google generate_204 so we can read Date.
 * Same approach as Authenticator Extension (HEAD + Date header).
 */
async function syncViaGoogleProxy(): Promise<ClockSyncStatus | null> {
  try {
    const url = `${import.meta.env.BASE_URL}api/google-time`
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null

    const data = (await response.json()) as {
      date?: string
      serverTime?: number
    }
    if (!data.serverTime || !data.date) return null

    return finish(data.serverTime, 'Google')
  } catch {
    return null
  }
}

/** CORS-friendly JSON time API (static hosting / GitHub Pages). */
async function syncViaWorldTimeApi(): Promise<ClockSyncStatus | null> {
  try {
    const response = await fetch(
      'https://worldtimeapi.org/api/timezone/Etc/UTC',
      { cache: 'no-store' },
    )
    if (!response.ok) return null

    const data = (await response.json()) as { unixtime?: number }
    if (typeof data.unixtime !== 'number') return null

    return finish(data.unixtime * 1000, 'WorldTimeAPI')
  } catch {
    return null
  }
}

/** Plain-text ISO timestamp from Akamai (CORS-friendly fallback). */
async function syncViaAkamai(): Promise<ClockSyncStatus | null> {
  try {
    const response = await fetch('https://time.akamai.com/?iso', {
      cache: 'no-store',
    })
    if (!response.ok) return null

    const text = (await response.text()).trim()
    const serverTime = new Date(text).getTime()
    if (Number.isNaN(serverTime)) return null

    return finish(serverTime, 'Akamai')
  } catch {
    return null
  }
}

/**
 * Sync local clock offset for TOTP.
 * Prefers Google (via Vite `/api/google-time` proxy in dev/preview), then
 * falls back to public CORS-friendly time APIs so sync works on GitHub Pages.
 */
export async function syncClockWithGoogle(): Promise<ClockSyncStatus> {
  const sources = [syncViaGoogleProxy, syncViaWorldTimeApi, syncViaAkamai]
  let sawClockTooFarOff = false
  let sawAnyAttempt = false

  for (const source of sources) {
    const result = await source()
    if (!result) continue
    sawAnyAttempt = true
    if (result.ok) return result
    if (result.reason === 'clock_too_far_off') sawClockTooFarOff = true
  }

  if (sawClockTooFarOff) return { ok: false, reason: 'clock_too_far_off' }
  if (sawAnyAttempt) return { ok: false, reason: 'updateFailure' }
  return { ok: false, reason: 'network' }
}
