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

// ---- narration (varied phrasing, no LLM) ---------------------------------------
//
// The flat "month: subject" row reads the same every month. This assembles one
// line per month from computed facts already on the entry: how long the streak
// has run, whether the subject just changed, and (when a real site event lands
// in the same month) a quiet cross-reference. Deterministic, no invented facts.

export interface TimelineEvent {
  month: string // YYYY-MM
  label: string // e.g. "he shipped the personal os wiki"
}

export interface LogLine {
  month: string
  text: string
}

function displaySubject(e: ObsessionLogEntry): string {
  if (e.kind === 'album') return `${e.subject}, ${e.artist}`
  return e.subject ?? ''
}

const NONE_LINES = [
  'the rotation stayed wide open this month, nothing over a third of it.',
  'no single thing owned the month; it stayed scattered across a lot of records.',
  'a spread month: plenty played, nothing that took over.',
]

const FIRST_LINES = (subject: string) => [
  `${subject} took the month.`,
  `this is the month ${subject} showed up and took over.`,
  `${subject} came in and claimed it.`,
]

const CHANGED_LINES = (subject: string) => [
  `the grip changed hands this month: ${subject} took over.`,
  `whatever ran things before let go; ${subject} is what's running now.`,
  `a new obsession took the wheel: ${subject}.`,
]

function streakLine(subject: string, streak: number): string {
  if (streak === 2) return `second month running: still ${subject}.`
  return `still ${subject}, ${streak} months deep now.`
}

function monthContext(month: string, events: TimelineEvent[]): string | null {
  const hit = events.find((e) => e.month === month)
  return hit ? hit.label : null
}

export function narrateLog(entries: ObsessionLogEntry[], events: TimelineEvent[] = []): LogLine[] {
  const out: LogLine[] = []
  let streak = 0
  let prevSubject: string | null = null

  entries.forEach((e, i) => {
    let text: string

    if (e.kind === 'none' || !e.subject) {
      text = NONE_LINES[i % NONE_LINES.length]
      streak = 0
      prevSubject = null
    } else {
      const subject = displaySubject(e)
      const sameAsPrev = e.subject === prevSubject
      streak = sameAsPrev ? streak + 1 : 1

      if (streak >= 2) {
        text = streakLine(subject, streak)
      } else if (prevSubject) {
        const pool = CHANGED_LINES(subject)
        text = pool[i % pool.length]
      } else {
        const pool = FIRST_LINES(subject)
        text = pool[i % pool.length]
      }
      prevSubject = e.subject
    }

    const context = monthContext(e.month, events)
    if (context) text += ` that's also the month ${context}.`

    out.push({ month: e.month, text })
  })

  return out
}
