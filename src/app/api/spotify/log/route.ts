import { NextResponse } from 'next/server'
import { logNowPlaying } from '@/lib/spotify'
import { isValidLogAuth } from '@/lib/music/logToken'

export const dynamic = 'force-dynamic'

// Called every minute by pg_cron (Supabase). Token-gated so the public cannot
// burn the Spotify quota. Fail-closed: no service key configured means 401.
export async function POST(req: Request) {
  const ok = isValidLogAuth(
    req.headers.get('authorization') ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const out = await logNowPlaying()
  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
