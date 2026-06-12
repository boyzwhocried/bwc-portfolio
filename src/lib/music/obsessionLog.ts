// The obsession log: a month-by-month timeline of what owned the rotation,
// derived from the dated snapshots in spotify_history. Pure + deterministic,
// same discipline as obsession.ts. The UI hides itself until the log spans
// at least two months, so the section lights up on its own as history grows.

import type { CachedTrack } from '@/types'
import { detectObsession, type ObsessionKind } from './obsession'

export interface HistorySnapshot {
  date: string // YYYY-MM-DD
  tracks: CachedTrack[] // that day's short_term top tracks
}

export interface ObsessionLogEntry {
  month: string // YYYY-MM
  subject: string | null
  artist: string | null
  kind: ObsessionKind
}

// One entry per month: the modal obsession across that month's snapshots.
// A month whose snapshots never converge on anything reads as 'none'.
export function buildObsessionLog(snapshots: HistorySnapshot[]): ObsessionLogEntry[] {
  const byMonth = new Map<string, HistorySnapshot[]>()
  for (const s of snapshots) {
    const month = s.date.slice(0, 7)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month)!.push(s)
  }

  const out: ObsessionLogEntry[] = []
  for (const [month, days] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const tally = new Map<string, { subject: string; artist: string; kind: ObsessionKind; count: number }>()
    for (const day of days) {
      const d = detectObsession(day.tracks)
      if (d.kind === 'none' || !d.subject) continue
      const key = `${d.kind}|${d.subject}`
      const t = tally.get(key) ?? { subject: d.subject, artist: d.artist ?? d.subject, kind: d.kind, count: 0 }
      t.count++
      tally.set(key, t)
    }
    const top = [...tally.values()].sort((a, b) => b.count - a.count)[0]
    out.push(
      top
        ? { month, subject: top.subject, artist: top.artist, kind: top.kind }
        : { month, subject: null, artist: null, kind: 'none' },
    )
  }
  return out
}

// Nothing to compare until a second month exists.
export function logIsWorthShowing(entries: ObsessionLogEntry[]): boolean {
  return entries.length >= 2
}
