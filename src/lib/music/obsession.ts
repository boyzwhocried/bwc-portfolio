// The obsession engine: a deterministic read of the listening data already in
// spotify_cache. No LLM, no external calls, no guessing: every sentence is
// assembled from computed facts (concentration, onset, spine, drift). Pure
// functions, unit-tested in obsession.test.ts. Rendered by MusicObsession.tsx.
//
// Voice rule: the narrative speaks to the visitor ABOUT the listener (third
// person), lowercase, site voice. Hard rule: never emit an em-dash.

import type { CachedArtist, CachedTrack, MusicData, TopRange } from '@/types'

export type ObsessionKind = 'album' | 'artist' | 'none'
export type Onset = 'new' | 'building' | 'long-running'
export type Mood = 'heavier' | 'lighter' | 'steady'

export interface ObsessionReport {
  kind: ObsessionKind
  subject: string | null // album name or artist name, depending on kind
  artist: string | null // the obsession's artist (kind album), or subject itself
  sharePct: number // share of the short-term top tracks
  onset: Onset | null
  gatewayTrack: string | null // the medium-term track that opened the door
  spine: string[] // artists present in all three ranges
  fading: string[] // high in medium-term, gone from short-term
  mood: Mood
  grazing: boolean // a second passive stream in recent plays
  stillActive: boolean // the obsession appears in the latest plays
  titles: string[] // the obsession's track titles, a found list
  headline: string
  placard: string[] // short mono facts, rendered as a strip
  paragraphs: string[] // the visitor-facing narrative
}

// share of short-term top tracks one album/artist must hold to count as the
// current obsession (plus an absolute floor so tiny lists cannot trigger it)
const ALBUM_SHARE = 0.35
const ARTIST_SHARE = 0.3
const MIN_TRACKS = 4
const FADING_SHORT_RANK = 15 // medium top 5 that lands at/after this (or gone)
const GRAZE_SHARE = 0.5
// |delta| must clear this before the page asserts a mood shift. Genre tags are
// one-per-artist and coarse, so borderline reads stay 'steady' (omitted) rather
// than risk a wrong public claim.
const MOOD_DELTA = 0.12
const MOOD_MIN_KNOWN = 2

// rough heaviness weights per Spotify genre tag, 0 (soft) to 1 (heavy).
// Unknown genres are skipped, never guessed; the mood stays 'steady' unless
// enough known genres exist on both sides.
const GENRE_WEIGHT: Record<string, number> = {
  deathcore: 0.95,
  metalcore: 0.9,
  screamo: 0.9,
  'post-hardcore': 0.85,
  hardcore: 0.85,
  'nu metal': 0.8,
  metal: 0.8,
  breakcore: 0.7,
  grunge: 0.65,
  punk: 0.6,
  emo: 0.6,
  'midwest emo': 0.55,
  shoegaze: 0.55,
  'alternative rock': 0.5,
  rock: 0.5,
  'pop punk': 0.5,
  hyperpop: 0.5,
  'emo rap': 0.5,
  electroclash: 0.45,
  rap: 0.4,
  'cloud rap': 0.4,
  'hip hop': 0.4,
  'indie rock': 0.4,
  indie: 0.35,
  'indie pop': 0.3,
  pop: 0.3,
  'dream pop': 0.25,
  'bedroom pop': 0.25,
  folk: 0.2,
  acoustic: 0.2,
}

// "Static Dress, Underoath" -> "Static Dress"
export function primaryArtist(artist: string): string {
  return artist.split(',')[0]?.trim() ?? artist
}

export interface Detection {
  kind: ObsessionKind
  subject: string | null
  artist: string | null
  count: number
  total: number
}

// One album or one artist dominating the short-term top tracks = the obsession.
// Album wins over artist (more specific). Wide rotations report 'none'.
export function detectObsession(tracks: CachedTrack[]): Detection {
  const total = tracks.length
  if (total === 0) return { kind: 'none', subject: null, artist: null, count: 0, total: 0 }

  const byAlbum = new Map<string, { album: string; artist: string; count: number }>()
  const byArtist = new Map<string, number>()
  for (const t of tracks) {
    const pa = primaryArtist(t.artist)
    const albumKey = `${t.album}|${pa}`
    const a = byAlbum.get(albumKey) ?? { album: t.album, artist: pa, count: 0 }
    a.count++
    byAlbum.set(albumKey, a)
    byArtist.set(pa, (byArtist.get(pa) ?? 0) + 1)
  }

  const topAlbum = [...byAlbum.values()].sort((x, y) => y.count - x.count)[0]
  if (topAlbum && topAlbum.album && topAlbum.count >= MIN_TRACKS && topAlbum.count / total >= ALBUM_SHARE) {
    return { kind: 'album', subject: topAlbum.album, artist: topAlbum.artist, count: topAlbum.count, total }
  }

  const topArtist = [...byArtist.entries()].sort((x, y) => y[1] - x[1])[0]
  if (topArtist && topArtist[1] >= MIN_TRACKS && topArtist[1] / total >= ARTIST_SHARE) {
    return { kind: 'artist', subject: topArtist[0], artist: topArtist[0], count: topArtist[1], total }
  }

  const maxCount = Math.max(topAlbum?.count ?? 0, topArtist?.[1] ?? 0)
  return { kind: 'none', subject: null, artist: null, count: maxCount, total }
}

type TopArtists = Record<TopRange, CachedArtist[]>

const names = (list: CachedArtist[] | undefined) => new Set((list ?? []).map((a) => a.name))

// How long the obsession artist has been around, judged by the longer ranges.
export function classifyOnset(artistName: string, topArtists: TopArtists): Onset {
  const inLong = names(topArtists.long_term).has(artistName)
  if (inLong) return 'long-running'
  const inMedium = names(topArtists.medium_term).has(artistName)
  return inMedium ? 'building' : 'new'
}

// The first medium-term top track by the obsession artist: the way in.
export function findGateway(artistName: string, mediumTracks: CachedTrack[] | undefined): string | null {
  const hit = (mediumTracks ?? []).find((t) => primaryArtist(t.artist) === artistName)
  return hit ? hit.name : null
}

// Artists present in every range: the permanent collection.
export function findSpine(topArtists: TopArtists): string[] {
  const m = names(topArtists.medium_term)
  const l = names(topArtists.long_term)
  return (topArtists.short_term ?? []).map((a) => a.name).filter((n) => m.has(n) && l.has(n))
}

// High in the medium-term but gone (or buried) in the short-term: loosening anchors.
export function findFading(topArtists: TopArtists): string[] {
  const short = (topArtists.short_term ?? []).map((a) => a.name)
  const out: string[] = []
  for (const a of (topArtists.medium_term ?? []).slice(0, 5)) {
    const rank = short.indexOf(a.name)
    if (rank === -1 || rank >= FADING_SHORT_RANK) out.push(a.name)
  }
  return out.slice(0, 2)
}

// Genre-weighted heaviness of the current window vs the all-time baseline.
export function moodShift(topArtists: TopArtists): Mood {
  const weigh = (list: CachedArtist[] | undefined) =>
    (list ?? [])
      .map((a) => (a.genre ? GENRE_WEIGHT[a.genre] : undefined))
      .filter((w): w is number => w !== undefined)
  const now = weigh(topArtists.short_term)
  const base = weigh(topArtists.long_term)
  if (now.length < MOOD_MIN_KNOWN || base.length < MOOD_MIN_KNOWN) return 'steady'
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const delta = mean(now) - mean(base)
  if (delta > MOOD_DELTA) return 'heavier'
  if (delta < -MOOD_DELTA) return 'lighter'
  return 'steady'
}

// A second, passive stream: most recent plays sitting outside the top rotation.
export function detectGrazing(recent: CachedTrack[], shortArtists: CachedArtist[] | undefined): boolean {
  if (recent.length === 0) return false
  const top = names(shortArtists)
  const outside = recent.filter((t) => !top.has(primaryArtist(t.artist))).length
  return outside / recent.length >= GRAZE_SHARE
}

// ---- narrative assembly -------------------------------------------------------

function joinNames(list: string[]): string {
  const xs = list.slice(0, 3)
  if (xs.length <= 1) return xs[0] ?? ''
  if (xs.length === 2) return `${xs[0]} and ${xs[1]}`
  return `${xs[0]}, ${xs[1]} and ${xs[2]}`
}

const ONSET_CLAUSE: Record<Onset, string> = {
  new: 'a month ago it was nowhere in his rotation.',
  building: 'it has been building for a few months and this is the month it took over.',
  'long-running': 'it has been with him for years; this month it simply took the wheel.',
}

const ONSET_PLACARD: Record<Onset, string> = {
  new: 'onset: new this month',
  building: 'onset: building for months',
  'long-running': 'onset: long-running',
}

function buildParagraphs(
  d: Detection,
  pct: number,
  onset: Onset | null,
  gateway: string | null,
  spine: string[],
  fading: string[],
  mood: Mood,
  grazing: boolean,
  stillActive: boolean,
): string[] {
  const ps: string[] = []

  if (d.kind === 'album') {
    let p = `${pct}% of everything he played in the last four weeks is one album: ${d.subject}, by ${d.artist}, front to back, on repeat.`
    if (onset) p += ` ${ONSET_CLAUSE[onset]}`
    if (gateway) p += ` one track, ${gateway}, had been quietly climbing for months, and then the whole record swallowed him.`
    if (stillActive) p += ` it is still running: the most recent thing he played is from it.`
    ps.push(p)
  } else if (d.kind === 'artist') {
    let p = `${pct}% of the last four weeks belongs to one name: ${d.subject}, scattered across different records rather than living in one.`
    if (onset) p += ` ${ONSET_CLAUSE[onset]}`
    if (gateway) p += ` the way in was ${gateway}.`
    if (stillActive) p += ` it is still running: the most recent thing he played is theirs.`
    ps.push(p)
  } else {
    ps.push(
      `no single record owns him right now. the last four weeks are spread wide, with nothing claiming more than ${pct}% of the rotation.`,
    )
  }

  if (mood === 'heavier') {
    ps.push(
      'it runs heavier than his long arc. the baseline is melodic and bright-sad; this stretch reaches for something darker and more abrasive.',
    )
  } else if (mood === 'lighter') {
    ps.push('it runs lighter than his long arc: softer textures than the rotation usually carries.')
  }

  if (spine.length > 0) {
    let p =
      spine.length === 1
        ? `one name never leaves, whatever the season: ${spine[0]}.`
        : `some names never leave, whatever the season: ${joinNames(spine)}.`
    p += ' when the current fixation burns off, that is where he lands.'
    if (fading.length > 0) p += ` meanwhile ${fading[0]} is quietly slipping out of the rotation.`
    ps.push(p)
  }

  if (grazing) {
    let p =
      'underneath it all a second, quieter stream keeps running: tracks his feeds hand him in passing, played once and let go.'
    if (d.kind !== 'none') p += ' those he grazes. the obsession is the thing he chose.'
    ps.push(p)
  }

  return ps
}

function buildPlacard(
  d: Detection,
  pct: number,
  onset: Onset | null,
  spine: string[],
  mood: Mood,
  stillActive: boolean,
): string[] {
  const seg: string[] = []
  if (d.kind === 'album') seg.push(`obsession: ${d.subject} by ${d.artist}`)
  else if (d.kind === 'artist') seg.push(`obsession: ${d.subject}`)
  else seg.push('no single obsession')
  seg.push(d.kind === 'none' ? `widest claim: ${pct}% of the rotation` : `${pct}% of the last 4 weeks`)
  if (onset) seg.push(ONSET_PLACARD[onset])
  if (spine.length > 0) seg.push(`constants: ${spine.slice(0, 2).join(', ')}`)
  if (mood !== 'steady') seg.push(`mood: ${mood} than baseline`)
  if (stillActive && d.kind !== 'none') seg.push('still active today')
  return seg
}

function buildHeadline(d: Detection): string {
  if (d.kind === 'album') return `living inside ${d.subject!.toLowerCase()}.`
  if (d.kind === 'artist') return `${d.subject!.toLowerCase()} owns the month.`
  return 'no single obsession right now.'
}

// ---- the report -----------------------------------------------------------------

export function buildObsessionReport(music: MusicData): ObsessionReport | null {
  const shortTracks = music.topTracks?.short_term
  const topArtists = music.topArtists
  if (!shortTracks || shortTracks.length === 0 || !topArtists) return null

  const d = detectObsession(shortTracks)
  const pct = d.total > 0 ? Math.round((d.count / d.total) * 100) : 0

  const onset = d.artist ? classifyOnset(d.artist, topArtists) : null
  const gateway = d.artist ? findGateway(d.artist, music.topTracks?.medium_term) : null
  const spine = findSpine(topArtists).filter((n) => n !== d.artist)
  const fading = findFading(topArtists)
  const mood = moodShift(topArtists)
  const recent = music.recentlyPlayed ?? []
  const grazing = detectGrazing(recent, topArtists.short_term)
  const stillActive =
    !!d.artist && recent.slice(0, 6).some((t) => primaryArtist(t.artist) === d.artist)

  const titles =
    d.kind === 'album'
      ? shortTracks.filter((t) => t.album === d.subject && primaryArtist(t.artist) === d.artist)
      : d.kind === 'artist'
        ? shortTracks.filter((t) => primaryArtist(t.artist) === d.artist)
        : []
  const seen = new Set<string>()
  const titleNames = titles
    .map((t) => t.name)
    .filter((n) => (seen.has(n) ? false : (seen.add(n), true)))
    .slice(0, 8)

  return {
    kind: d.kind,
    subject: d.subject,
    artist: d.artist,
    sharePct: pct,
    onset,
    gatewayTrack: gateway,
    spine,
    fading,
    mood,
    grazing,
    stillActive,
    titles: titleNames,
    headline: buildHeadline(d),
    placard: buildPlacard(d, pct, onset, spine, mood, stillActive),
    paragraphs: buildParagraphs(d, pct, onset, gateway, spine, fading, mood, grazing, stillActive),
  }
}
