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

const arrLen = (v: unknown): number => (Array.isArray(v) ? v.length : 0)

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
  ]
  for (const [what, before, after] of checks) {
    if (before !== after) errors.push(`${before - after} ${what}(s) invalid (bad shape, em-dash, or missing source)`)
  }
  if (errors.length > 0) return { payload: null, errors, summary: '' }
  const n = parsed.runs.length
  const b = parsed.blurbs.length
  return {
    payload: parsed,
    errors: [],
    summary: `${n} run${n === 1 ? '' : 's'}, ${b} blurb${b === 1 ? '' : 's'}, as of ${parsed.asOf}`,
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
