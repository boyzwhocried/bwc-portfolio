import { SpotifyTrack } from '@/types'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing'

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
    next: { revalidate: 3500 },
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function getNowPlaying(): Promise<SpotifyTrack | null> {
  const token = await getAccessToken()
  if (!token) return null

  const res = await fetch(NOW_PLAYING_URL, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 30 },
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
