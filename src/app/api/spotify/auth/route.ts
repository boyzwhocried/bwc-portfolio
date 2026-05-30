import { NextResponse } from 'next/server'

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
].join(' ')

export function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
  })

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  )
}
