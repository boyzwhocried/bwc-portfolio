import { createHash, timingSafeEqual } from 'node:crypto'

// The cron caller authenticates with a token DERIVED from the service-role key,
// so the key itself never sits in the cron job and no extra env var is needed.
// A leaked token can only call /api/spotify/log (log what is playing).
export function logToken(serviceKey: string): string {
  return createHash('sha256').update(`${serviceKey}:spotify-log`).digest('hex')
}

export function isValidLogAuth(header: string, serviceKey: string | undefined): boolean {
  if (!serviceKey) return false
  const want = Buffer.from(`Bearer ${logToken(serviceKey)}`)
  const got = Buffer.from(header)
  return got.length === want.length && timingSafeEqual(got, want)
}
