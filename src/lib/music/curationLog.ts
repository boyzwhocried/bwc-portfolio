// The curation log: a public record of Spotify curation runs, published to the
// spotify_cache key `curation_log` ONLY when Verrel says yes after a run.
// Pure + deterministic. parseCurationLog is the gate for both the page and the
// publish script (scripts/music/publish-curation.mjs), so keep this file free
// of path aliases and runtime imports: Node strips the types and imports it.
//
// Voice rule: lowercase site voice, never an em-dash (any string carrying one
// is dropped, not repaired).

import type { ObsessionReport } from './obsession'

export interface CurationShelf {
  name: string
  count: number
  artists: string[]
}

export interface CurationRun {
  date: string // YYYY-MM-DD
  songsIn: number
  shelves: CurationShelf[]
  otherPlaylists: number
  repeats: { artist: string; track: string }[]
  skipped: { count: number; reasons: { reason: string; count: number }[] }
}

export interface CurationBlurb {
  artist: string
  album?: string
  text: string
  source: string
}

export interface CurationLog {
  asOf: string // YYYY-MM-DD
  rules: string[]
  runs: CurationRun[] // newest first
  blurbs: CurationBlurb[]
}

export interface CurationView {
  asOf: string
  rules: string[]
  runs: { heading: string; summary: string; shelves: CurationShelf[]; repeats: CurationRun['repeats']; skippedReasons: string[] }[]
  blurbs: CurationBlurb[]
}

const EM_DASH = String.fromCharCode(0x2014)
const BLURB_MAX = 280
const SUMMARY_SHELVES = 5
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const clean = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !v.includes(EM_DASH)
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function parseShelf(v: unknown): CurationShelf | null {
  if (!isObj(v) || !clean(v.name) || !count(v.count)) return null
  return { name: v.name, count: v.count, artists: list(v.artists).filter(clean) }
}

function parseRun(v: unknown): CurationRun | null {
  if (!isObj(v) || typeof v.date !== 'string' || !DATE_RE.test(v.date)) return null
  if (!count(v.songsIn) || !count(v.otherPlaylists)) return null
  const sk = isObj(v.skipped) ? v.skipped : {}
  const reasons = list(sk.reasons).flatMap((r) =>
    isObj(r) && clean(r.reason) && count(r.count) ? [{ reason: r.reason, count: r.count }] : [],
  )
  return {
    date: v.date,
    songsIn: v.songsIn,
    shelves: list(v.shelves).flatMap((s) => parseShelf(s) ?? []).sort((a, b) => b.count - a.count),
    otherPlaylists: v.otherPlaylists,
    repeats: list(v.repeats).flatMap((r) => (isObj(r) && clean(r.artist) && clean(r.track) ? [{ artist: r.artist, track: r.track }] : [])),
    skipped: { count: count(sk.count) ? sk.count : 0, reasons },
  }
}

function parseBlurb(v: unknown): CurationBlurb | null {
  if (!isObj(v) || !clean(v.artist) || !clean(v.text) || v.text.length > BLURB_MAX) return null
  if (typeof v.source !== 'string' || !/^https?:\/\//.test(v.source)) return null
  if (v.album !== undefined && !clean(v.album)) return null
  return { artist: v.artist, ...(v.album ? { album: v.album as string } : {}), text: v.text, source: v.source }
}

export function parseCurationLog(raw: unknown): CurationLog | null {
  if (!isObj(raw) || typeof raw.asOf !== 'string' || !DATE_RE.test(raw.asOf)) return null
  const runs = list(raw.runs)
    .flatMap((r) => parseRun(r) ?? [])
    .sort((a, b) => b.date.localeCompare(a.date))
  if (runs.length === 0) return null
  return {
    asOf: raw.asOf,
    rules: list(raw.rules).filter(clean),
    runs,
    blurbs: list(raw.blurbs).flatMap((b) => parseBlurb(b) ?? []),
  }
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

function summarise(r: CurationRun): string {
  const parts = [`${r.songsIn} songs in.`]
  const top = r.shelves.slice(0, SUMMARY_SHELVES)
  const dest = top.map((s) => `${s.count} to ${s.name}`)
  const rest = r.shelves.length - top.length
  if (rest > 0) dest.push(`and ${rest} more playlist${rest === 1 ? '' : 's'}`)
  if (r.otherPlaylists > 0) dest.push(`${r.otherPlaylists} to other playlists`)
  if (dest.length > 0) parts.push(`${dest.join(', ')}.`)
  if (r.skipped.count > 0) parts.push(`${r.skipped.count} skipped.`)
  return parts.join(' ')
}

export function curationView(log: CurationLog | null): CurationView | null {
  if (!log) return null
  return {
    asOf: `as of ${dateLabel(log.asOf)}`,
    rules: log.rules,
    runs: log.runs.map((r) => ({
      heading: dateLabel(r.date),
      summary: summarise(r),
      shelves: r.shelves,
      repeats: r.repeats,
      skippedReasons: r.skipped.reasons.map((x) => `${x.count} ${x.reason}`),
    })),
    blurbs: log.blurbs,
  }
}

// "the read" only renders when something really owns the month.
export function readIsWorthShowing(report: Pick<ObsessionReport, 'kind'> | null): boolean {
  return !!report && report.kind !== 'none'
}
