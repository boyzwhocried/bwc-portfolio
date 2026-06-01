import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Pulse heartbeat, pull mode. Public, read-only liveness probe that Pulse
// (personal mission control) fetches each poll cycle to render the portfolio on
// the board. Must never throw: if the project count is momentarily unavailable
// we still report liveness rather than fake an outage.
export const dynamic = 'force-dynamic'

export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  try {
    const supabase = createServerClient()
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
    return NextResponse.json({
      status: 'up',
      version,
      metrics: { projects: count ?? 0 },
    })
  } catch {
    return NextResponse.json({ status: 'up', version })
  }
}
