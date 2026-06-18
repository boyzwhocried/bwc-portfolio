import { NextResponse } from 'next/server'
import { dailyVerse } from '@/actions/verse'
import { createServiceClient } from '@/lib/supabase/service'

// Read-only liveness probe for "the verse": exercises the full daily path (the
// service-role bank read + the cipher build) and reports only safe metadata —
// never the plaintext, hash, or ciphertext. Lets a deploy be verified end-to-end
// without a browser. Must never throw.
export const dynamic = 'force-dynamic'

export async function GET() {
  // TEMP diagnostic: surface why the bank read might be empty (booleans + count
  // + error string only; no secret values). Removed once the path is confirmed.
  const diag: Record<string, unknown> = {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  try {
    const sb = createServiceClient()
    diag.clientNull = !sb
    if (sb) {
      const { data, error } = await sb
        .from('sandbox_verse_bank')
        .select('id')
        .limit(1)
      diag.rows = data?.length ?? -1
      diag.err = error?.message ?? null
      diag.code = (error as { code?: string } | null)?.code ?? null
    }
  } catch (e) {
    diag.threw = String(e)
  }

  // raw REST probe to capture the literal HTTP status of the service-role read
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL
    const k = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (u && k) {
      const resp = await fetch(`${u}/rest/v1/sandbox_verse_bank?select=id&limit=1`, {
        headers: { apikey: k, Authorization: `Bearer ${k}` },
        cache: 'no-store',
      })
      diag.restStatus = resp.status
      diag.restBody = (await resp.text()).slice(0, 160)
      diag.keyTail = k.slice(-4)
    }
  } catch (e) {
    diag.restThrew = String(e)
  }

  try {
    const r = await dailyVerse()
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.error, diag })
    const p = r.puzzle
    return NextResponse.json({
      ok: true,
      no: p.no,
      wordCount: p.wordCount,
      starters: p.starters.length,
      letters: p.cipherText.replace(/[^a-z]/g, '').length,
      diag,
    })
  } catch {
    return NextResponse.json({ ok: false, reason: 'error', diag })
  }
}
