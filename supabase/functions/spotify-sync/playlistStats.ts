// Pure, dependency-free playlist statistics. Runs in the Deno edge function
// (spotify-sync) AND is unit-tested by vitest (Node). So: no Deno globals, no
// jsr/npm imports, no path aliases. Plain TypeScript only.

export interface StatTrack {
  name: string
  artist: string // primary (first credited) artist
  album: string
  image: string
  url: string
  addedAt: string // ISO timestamp the track was added to the playlist ('' if unknown)
  releaseYear: number | null
}

export interface SampleTrack {
  name: string
  artist: string
  image: string
  url: string
}

export interface DecadeBucket {
  decade: number // e.g. 1990, 2000, 2010
  count: number
}

export function firstLastAdded(tracks: StatTrack[]): { first: string | null; last: string | null } {
  const dates = tracks.map((x) => x.addedAt).filter((d): d is string => !!d).sort()
  if (dates.length === 0) return { first: null, last: null }
  return { first: dates[0], last: dates[dates.length - 1] }
}

export function eraSpan(tracks: StatTrack[]): { from: number | null; to: number | null } {
  const years = tracks.map((x) => x.releaseYear).filter((y): y is number => typeof y === 'number')
  if (years.length === 0) return { from: null, to: null }
  return { from: Math.min(...years), to: Math.max(...years) }
}

export function decadeHistogram(tracks: StatTrack[]): DecadeBucket[] {
  const counts = new Map<number, number>()
  for (const x of tracks) {
    if (typeof x.releaseYear !== 'number') continue
    const decade = Math.floor(x.releaseYear / 10) * 10
    counts.set(decade, (counts.get(decade) ?? 0) + 1)
  }
  return [...counts.entries()].map(([decade, count]) => ({ decade, count })).sort((a, b) => a.decade - b.decade)
}

export function topArtists(tracks: StatTrack[], n: number): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const x of tracks) {
    const name = (x.artist ?? '').trim()
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, n)
}

export function pickSampleTracks(tracks: StatTrack[], n: number): SampleTrack[] {
  return tracks.slice(0, n).map((x) => ({ name: x.name, artist: x.artist, image: x.image, url: x.url }))
}

export function anchorFallback(tracks: StatTrack[]): SampleTrack | null {
  if (tracks.length === 0) return null
  const top = topArtists(tracks, 1)[0]
  const pick = top ? tracks.find((x) => x.artist === top.name) ?? tracks[0] : tracks[0]
  return { name: pick.name, artist: pick.artist, image: pick.image, url: pick.url }
}

// Mood label to a fixed swatch set (deterministic). Cover-art color extraction
// is avoided on purpose: Spotify images (i.scdn.co) taint the canvas under CORS.
const MOOD_PALETTES: { match: RegExp; palette: string[] }[] = [
  { match: /(heavy|dark|brood|rage|angry|aggress)/, palette: ['#2a1a1a', '#5a2a2a', '#8a3a2a', '#c24a28'] },
  { match: /(sad|blue|melanch|grief|longing|wistful)/, palette: ['#1a2233', '#2a3a55', '#3a5577', '#5a7799'] },
  { match: /(calm|warm|soft|tender|cozy|gentle)/, palette: ['#332a1a', '#5a4a2a', '#8a7340', '#c2a85a'] },
  { match: /(bright|happy|joy|upbeat|playful|fun)/, palette: ['#2a331a', '#4a5a2a', '#7a8a3a', '#a8c24a'] },
  { match: /(dream|hazy|ethereal|ambient|float)/, palette: ['#2a1a33', '#422a5a', '#5a3a8a', '#7a5ac2'] },
]
const DEFAULT_PALETTE = ['#222', '#3a3a3a', '#555', '#777']

export function moodPalette(label: string): string[] {
  const l = (label ?? '').toLowerCase()
  for (const { match, palette } of MOOD_PALETTES) if (match.test(l)) return palette
  return DEFAULT_PALETTE
}
