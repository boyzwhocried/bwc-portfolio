// Pure core of scripts/music/publish-curation.mjs. No network here: the script
// injects `upsert`. Publishing is never automatic: dry run unless `yes`, and a
// file the page parser would silently trim is rejected instead of trimmed.

import { parseCurationLog, type CurationLog } from './curationLog.ts'

export interface PublishPlan {
  payload: CurationLog | null
  errors: string[]
  summary: string
}

export interface UpsertRow {
  key: string
  payload: CurationLog
  updated_at: string
}

// Same idea for months: sum a per-month field that is an array (length) or a
// string (present = 1), or count array entries carrying a non-null note.
function sumMonths(months: unknown, field: 'cover' | 'tracks' | 'artists' | 'trackNotes' | 'artistNotes'): number {
  if (!Array.isArray(months)) return 0
  return months.reduce((n: number, m) => {
    const rec = (m ?? {}) as Record<string, unknown>
    if (field === 'cover') return n + (typeof rec.cover === 'string' ? 1 : 0)
    const key = field === 'tracks' || field === 'trackNotes' ? 'tracks' : 'artists'
    const items = Array.isArray(rec[key]) ? (rec[key] as Record<string, unknown>[]) : []
    if (field === 'tracks' || field === 'artists') return n + items.length
    return n + items.filter((i) => typeof i?.note === 'string').length
  }, 0)
}

const arrLen = (v: unknown): number => (Array.isArray(v) ? v.length : 0)

// How many picks (array) or covers (string) the raw file carries across its runs.
function sumRuns(runs: unknown, field: 'picks' | 'cover'): number {
  if (!Array.isArray(runs)) return 0
  return runs.reduce((n: number, r) => {
    const rec = r as Record<string, unknown> | null
    const v = rec?.[field]
    return n + (field === 'picks' ? arrLen(v) : v === undefined || v === null ? 0 : 1)
  }, 0)
}

export function planPublish(raw: unknown): PublishPlan {
  const parsed = parseCurationLog(raw)
  if (!parsed) {
    return { payload: null, errors: ['no valid run or bad asOf date'], summary: '' }
  }
  const src = raw as Record<string, unknown>
  const errors: string[] = []
  const checks: [string, number, number][] = [
    ['run', arrLen(src.runs), parsed.runs.length],
    ['blurb', arrLen(src.blurbs), parsed.blurbs.length],
    ['rule', arrLen(src.rules), parsed.rules.length],
    ['caption', arrLen(src.captions), parsed.captions.length],
    ['pick', sumRuns(src.runs, 'picks'), parsed.runs.reduce((n, r) => n + r.picks.length, 0)],
    ['month', arrLen(src.months), parsed.months.length],
    ['month cover', sumMonths(src.months, 'cover'), parsed.months.reduce((n, m) => n + (m.cover ? 1 : 0), 0)],
    ['month track', sumMonths(src.months, 'tracks'), parsed.months.reduce((n, m) => n + m.tracks.length, 0)],
    ['month track note', sumMonths(src.months, 'trackNotes'), parsed.months.reduce((n, m) => n + m.tracks.filter((t) => t.note).length, 0)],
    ['month artist', sumMonths(src.months, 'artists'), parsed.months.reduce((n, m) => n + m.artists.length, 0)],
    ['month artist note', sumMonths(src.months, 'artistNotes'), parsed.months.reduce((n, m) => n + m.artists.filter((a) => a.note).length, 0)],
    ['cover', sumRuns(src.runs, 'cover'), parsed.runs.reduce((n, r) => n + (r.cover ? 1 : 0), 0)],
  ]
  for (const [what, before, after] of checks) {
    if (before !== after) errors.push(`${before - after} ${what}(s) invalid (bad shape, em-dash, or missing source)`)
  }
  if (errors.length > 0) return { payload: null, errors, summary: '' }
  const n = parsed.runs.length
  const b = parsed.blurbs.length
  const mo = parsed.months.length
  return {
    payload: parsed,
    errors: [],
    summary: `${n} run${n === 1 ? '' : 's'}, ${mo > 0 ? `${mo} month${mo === 1 ? '' : 's'}, ` : ''}${b} blurb${b === 1 ? '' : 's'}, as of ${parsed.asOf}`,
  }
}

export async function runPublish(
  raw: unknown,
  opts: { yes: boolean; upsert: (row: UpsertRow) => Promise<void> },
): Promise<{ wrote: boolean; summary: string }> {
  const plan = planPublish(raw)
  if (!plan.payload) throw new Error(`invalid curation log: ${plan.errors.join('; ')}`)
  if (!opts.yes) return { wrote: false, summary: plan.summary }
  await opts.upsert({ key: 'curation_log', payload: plan.payload, updated_at: new Date().toISOString() })
  return { wrote: true, summary: plan.summary }
}
