import { createServerClient } from '@/lib/supabase/server'
import type { CachedTrack, MusicData } from '@/types'

const EMPTY: MusicData = {
  topTracks: null,
  topArtists: null,
  recentlyPlayed: null,
  shelf: null,
  thisMonth: null,
  ofInsta: null,
  obsessionThemes: null,
  updatedAt: null,
}

// Reads every spotify_cache key in one round-trip. Public RLS select, so the
// anon client is enough. Returns EMPTY (graceful) if the cache is not seeded yet.
export async function getMusicData(): Promise<MusicData> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('spotify_cache')
    .select('key, payload, updated_at')

  if (error || !data || data.length === 0) return EMPTY

  const byKey = new Map(data.map((r) => [r.key, r]))
  const payload = <T>(k: string): T | null => (byKey.get(k)?.payload as T) ?? null
  const updatedAt =
    data.map((r) => r.updated_at as string).sort().at(-1) ?? null

  return {
    topTracks: payload('top_tracks'),
    topArtists: payload('top_artists'),
    recentlyPlayed: payload('recently_played'),
    shelf: payload('playlists_shelf'),
    thisMonth: payload('playlist_this_month'),
    ofInsta: payload('playlist_of_insta'),
    obsessionThemes: payload('obsession_themes'),
    updatedAt,
  }
}

// Dated top-track snapshots from spotify_history (public read), oldest first.
// Feeds the obsession log; empty (graceful) until history accumulates.
export async function getMusicHistory(): Promise<{ date: string; tracks: CachedTrack[] }[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('spotify_history')
    .select('snapshot_date, payload')
    .eq('key', 'top_tracks')
    .order('snapshot_date', { ascending: true })
    .limit(366)

  if (error || !data) return []
  return data
    .map((r) => ({
      date: r.snapshot_date as string,
      tracks: ((r.payload as Record<string, CachedTrack[]>)?.short_term ?? []) as CachedTrack[],
    }))
    .filter((s) => s.tracks.length > 0)
}
