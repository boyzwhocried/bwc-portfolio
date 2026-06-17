import { NextResponse } from 'next/server'
import { dailyVerse } from '@/actions/verse'

// Read-only liveness probe for "the verse": exercises the full daily path (the
// service-role bank read + the cipher build) and reports only safe metadata —
// never the plaintext, hash, or ciphertext. Lets a deploy be verified end-to-end
// without a browser. Must never throw.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const r = await dailyVerse()
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.error })
    const p = r.puzzle
    return NextResponse.json({
      ok: true,
      no: p.no,
      wordCount: p.wordCount,
      starters: p.starters.length,
      letters: p.cipherText.replace(/[^a-z]/g, '').length,
    })
  } catch {
    return NextResponse.json({ ok: false, reason: 'error' })
  }
}
