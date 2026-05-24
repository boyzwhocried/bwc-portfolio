import { SpotifyTrack } from '@/types'

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    next: { revalidate: 3500 },
  })

  const data = await res.json()
  return data.access_token
}

export async function getNowPlaying(): Promise<SpotifyTrack | null> {
  // client_credentials cannot access user playback — returns null always.
  // Upgrade path: Authorization Code flow with refresh token (post-V1).
  void getAccessToken
  return null
}

export async function getRecentlyPlayed(): Promise<SpotifyTrack | null> {
  // Same note — requires user auth token.
  return null
}
