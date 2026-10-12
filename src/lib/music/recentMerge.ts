import type { CachedTrack } from '@/types'

// Spotify's recently-played endpoint can stall for hours, so the live feed also
// carries plays we logged ourselves from currently-playing. Merge both, newest
// first, one card per track (url), keeping the freshest play of each.
export function mergeRecent(
  spotify: CachedTrack[],
  logged: CachedTrack[],
  limit = 20,
): CachedTrack[] {
  const newest = new Map<string, CachedTrack>()
  for (const t of [...spotify, ...logged]) {
    if (!t.url) continue
    const cur = newest.get(t.url)
    if (!cur || (t.played_at ?? '') > (cur.played_at ?? '')) newest.set(t.url, t)
  }
  return [...newest.values()]
    .sort((a, b) => (b.played_at ?? '').localeCompare(a.played_at ?? ''))
    .slice(0, limit)
}
