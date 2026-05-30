import { NextResponse } from 'next/server'
import { getLiveSpotify } from '@/lib/spotify'

export const dynamic = 'force-dynamic'

// Per-request handler, but getLiveSpotify() returns a 30s shared-cached result,
// so this makes a real Spotify call at most ~once per 30s across all visitors.
export async function GET() {
  const data = await getLiveSpotify()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
