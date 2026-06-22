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
