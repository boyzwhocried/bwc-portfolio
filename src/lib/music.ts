import { createServerClient } from '@/lib/supabase/server'
import type { MusicData } from '@/types'

const EMPTY: MusicData = {
  topTracks: null,
  topArtists: null,
  recentlyPlayed: null,
  shelf: null,
  thisMonth: null,
  ofInsta: null,
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
    updatedAt,
  }
}
