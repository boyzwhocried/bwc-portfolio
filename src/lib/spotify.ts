import { unstable_cache } from 'next/cache'
import { SpotifyTrack, CachedTrack, SpotifyLive } from '@/types'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const API = 'https://api.spotify.com/v1'

async function getAccessToken(): Promise<string | null> {
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN
  if (!refreshToken) return null

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

async function fetchNowPlaying(token: string): Promise<SpotifyTrack | null> {
  const res = await fetch(`${API}/me/player/currently-playing`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) return null

  const data = await res.json()
  if (!data.item || data.currently_playing_type !== 'track') return null

  return {
    is_playing: data.is_playing,
    title: data.item.name,
    artist: data.item.artists.map((a: { name: string }) => a.name).join(', '),
    album: data.item.album.name,
    album_art_url: data.item.album.images[0]?.url ?? '',
    track_url: data.item.external_urls.spotify,
  }
}

async function fetchRecent(token: string): Promise<CachedTrack[]> {
  const res = await fetch(`${API}/me/player/recently-played?limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []

  const data = await res.json()
  const seen = new Set<string>()
  const out: CachedTrack[] = []
  for (const it of data.items ?? []) {
    const t = it.track
    if (!t) continue
    const url = t.external_urls?.spotify ?? ''
    if (seen.has(url)) continue // collapse repeats
    seen.add(url)
    out.push({
      name: t.name,
      artist: (t.artists ?? []).map((a: { name: string }) => a.name).join(', '),
      album: t.album?.name ?? '',
      image: t.album?.images?.[0]?.url ?? '',
      url,
      played_at: it.played_at,
    })
  }
  return out
}

// Single shared cache for ALL live reads. unstable_cache dedupes across requests
// AND serverless instances: the body runs at most once per 30s no matter how many
// visitors are on the page, so Spotify calls stay flat under heavy traffic.
export const getLiveSpotify = unstable_cache(
  async (): Promise<SpotifyLive> => {
    const token = await getAccessToken()
    if (!token) return { nowPlaying: null, recent: [] }
    const [nowPlaying, recent] = await Promise.all([
      fetchNowPlaying(token),
      fetchRecent(token),
    ])
    return { nowPlaying, recent }
  },
  ['spotify-live'],
  { revalidate: 30 }
)

// Footer widget still calls this; it now shares the same 30s cache.
export async function getNowPlaying(): Promise<SpotifyTrack | null> {
  return (await getLiveSpotify()).nowPlaying
}
