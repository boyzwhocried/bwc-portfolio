// The curation log, shaped like a zine: every curation run is an "issue" with a
// cover line and liner notes in Verrel's own words, the counts demoted to a
// footnote. Published to the spotify_cache key `curation_log` ONLY when Verrel
// says yes after a run. Pure + deterministic. parseCurationLog is the gate for
// both the page and scripts/music/publish-curation.mjs, so keep this file free
// of path aliases and runtime imports: Node strips the types and imports it.
//
// Voice rule: lowercase site voice, never an em-dash (any string carrying one
// is dropped, not repaired). No lyrics anywhere: notes are his words only.

import type { ObsessionReport } from './obsession'

export interface CurationShelf {
  name: string
  count: number
  artists: string[]
}

export interface CurationPick {
  artist: string
  track: string
  note: string | null // a few words from him about the song
}

// What he was actually playing when the issue came out: a snapshot of the site's
// short-term top tracks/artists taken at publish time, plus his own words on why.
export interface CurationOnRepeat {
  tracks: { artist: string; track: string }[]
  artists: string[]
  note: string | null
}

export interface CurationRun {
  date: string // YYYY-MM-DD
  songsIn: number
  shelves: CurationShelf[] // biggest first
  otherPlaylists: number
  artists: string[] // lead artists of the batch, most songs first
  cover: string | null // one line from him: what this batch felt like
  picks: CurationPick[]
  onRepeat: CurationOnRepeat | null
  skipped: { count: number; reasons: { reason: string; count: number }[] }
}

export interface CurationBlurb {
  artist: string
  album?: string
  text: string
  source: string
}

export interface CurationCaption {
  playlist: string
  text: string // what the playlist name means, in his words
}

export interface CurationLog {
  asOf: string // YYYY-MM-DD
  rules: string[]
  captions: CurationCaption[]
  runs: CurationRun[] // newest first
  blurbs: CurationBlurb[]
}

export interface IssueView {
  number: number // 1 = the oldest run
  heading: string
  cover: string | null
  artistsLine: string | null
  picks: CurationPick[]
  onRepeat: CurationOnRepeat | null
  tags: string[] // the 3 biggest playlists
  footnote: string
}

export interface CurationView {
  asOf: string
  rules: string[]
  latest: IssueView
  past: IssueView[]
  legend: CurationCaption[] // captions for the latest issue's tags only
  blurbs: CurationBlurb[]
}

const EM_DASH = String.fromCharCode(0x2014)
const BLURB_MAX = 280
const COVER_MAX = 160
const NOTE_MAX = 120
const CAPTION_MAX = 100
const ON_REPEAT_MAX = 5
const ON_REPEAT_NOTE_MAX = 160
const TAGS = 3
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const clean = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '' && !v.includes(EM_DASH)
const short = (v: unknown, max: number): v is string => clean(v) && v.length <= max
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function parseShelf(v: unknown): CurationShelf | null {
  if (!isObj(v) || !clean(v.name) || !count(v.count)) return null
  return { name: v.name, count: v.count, artists: list(v.artists).filter(clean) }
}

function parsePick(v: unknown): CurationPick | null {
  if (!isObj(v) || !clean(v.artist) || !clean(v.track)) return null
  if (v.note !== undefined && v.note !== null && !short(v.note, NOTE_MAX)) return null
  return { artist: v.artist, track: v.track, note: (v.note as string | undefined) ?? null }
}

function parseOnRepeat(v: unknown): CurationOnRepeat | null {
  if (!isObj(v)) return null
  const tracks = list(v.tracks)
    .flatMap((t) => (isObj(t) && clean(t.artist) && clean(t.track) ? [{ artist: t.artist, track: t.track }] : []))
    .slice(0, ON_REPEAT_MAX)
  const artists = list(v.artists).filter(clean).slice(0, ON_REPEAT_MAX)
  const note = short(v.note, ON_REPEAT_NOTE_MAX) ? v.note : null
  if (tracks.length === 0 && artists.length === 0 && !note) return null
  return { tracks, artists, note }
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
    shelves: list(v.shelves)
      .flatMap((s) => parseShelf(s) ?? [])
      .sort((a, b) => b.count - a.count),
    otherPlaylists: v.otherPlaylists,
    artists: list(v.artists).filter(clean),
    cover: short(v.cover, COVER_MAX) ? v.cover : null,
    picks: list(v.picks).flatMap((p) => parsePick(p) ?? []),
    onRepeat: parseOnRepeat(v.onRepeat),
    skipped: { count: count(sk.count) ? sk.count : 0, reasons },
  }
}

function parseBlurb(v: unknown): CurationBlurb | null {
  if (!isObj(v) || !clean(v.artist) || !short(v.text, BLURB_MAX)) return null
  if (typeof v.source !== 'string' || !/^https?:\/\//.test(v.source)) return null
  if (v.album !== undefined && !clean(v.album)) return null
  return { artist: v.artist, ...(v.album ? { album: v.album as string } : {}), text: v.text, source: v.source }
}

function parseCaption(v: unknown): CurationCaption | null {
  return isObj(v) && clean(v.playlist) && short(v.text, CAPTION_MAX) ? { playlist: v.playlist, text: v.text } : null
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
    captions: list(raw.captions).flatMap((c) => parseCaption(c) ?? []),
    runs,
    blurbs: list(raw.blurbs).flatMap((b) => parseBlurb(b) ?? []),
  }
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
}

function footnote(r: CurationRun): string {
  const parts = [`${r.songsIn} songs in`]
  const n = r.shelves.length
  if (n > 0) parts.push(`${n} playlist${n === 1 ? '' : 's'}`)
  if (r.skipped.count > 0) parts.push(`${r.skipped.count} skipped`)
  return parts.join(' · ')
}

function issue(r: CurationRun, number: number): IssueView {
  return {
    number,
    heading: dateLabel(r.date),
    cover: r.cover,
    artistsLine: r.artists.length > 0 ? r.artists.join(' · ') : null,
    picks: r.picks,
    onRepeat: r.onRepeat,
    tags: r.shelves.slice(0, TAGS).map((s) => s.name),
    footnote: footnote(r),
  }
}

export function curationView(log: CurationLog | null): CurationView | null {
  if (!log) return null
  const total = log.runs.length
  const issues = log.runs.map((r, i) => issue(r, total - i)) // runs are newest first
  const [latest, ...past] = issues
  return {
    asOf: `as of ${dateLabel(log.asOf)}`,
    rules: log.rules,
    latest,
    past,
    legend: latest.tags.flatMap((t) => log.captions.filter((c) => c.playlist === t)),
    blurbs: log.blurbs,
  }
}

// "the read" only renders when something really owns the month.
export function readIsWorthShowing(report: Pick<ObsessionReport, 'kind'> | null): boolean {
  return !!report && report.kind !== 'none'
}
