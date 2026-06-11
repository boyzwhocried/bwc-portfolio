import { Metadata } from 'next'
import Link from 'next/link'
import DriftingSquares from '@/components/ui/DriftingSquares'
import NowHeadline from '@/components/sections/NowHeadline'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'now',
  description: 'what i am focused on right now. a living changelog of the platform growing.',
}

// hourly ISR: new now_entries appear without a redeploy (kills the stale-bake class)
export const revalidate = 3600

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

type NowEntry = { id: number; date: string; body: string }
type NowCurrently = { id: number; key: string; value: string; sort_order: number }

// the big italic headline derives from the latest entry, but full entries got
// long; cut to the first clause (before ':' or '.') and hard-cap on a word break.
function toHeadline(body: string): string {
  const clauseEnd = body.search(/[:.]/)
  let head = clauseEnd > 0 ? body.slice(0, clauseEnd) : body
  if (head.length > 90) {
    head = head.slice(0, 90)
    const lastSpace = head.lastIndexOf(' ')
    head = (lastSpace > 0 ? head.slice(0, lastSpace) : head) + '…'
  }
  return head
}

export default async function NowPage() {
  const supabase = createServerClient()

  const [entriesResult, currentlyResult] = await Promise.all([
    supabase
      .from('now_entries')
      .select('id, date, body')
      .eq('published', true)
      .order('date', { ascending: false }),
    supabase
      .from('now_currently')
      .select('id, key, value, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  if (entriesResult.error) { console.error('[now] entries fetch failed:', entriesResult.error.message); throw new Error('Failed to load /now content') }
  if (currentlyResult.error) { console.error('[now] currently fetch failed:', currentlyResult.error.message); throw new Error('Failed to load /now content') }

  const nowEntries: NowEntry[] = entriesResult.data ?? []
  const nowCurrently: NowCurrently[] = currentlyResult.data ?? []
  const lastUpdated = nowEntries[0]?.date ?? ''

  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="now" color="var(--vermilion)" opacity={0.09} count={6} />

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3.5rem', paddingBottom: '2rem' }}>
        {/* kicker + live updated line */}
        <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span className="uppercase" style={{ color: 'var(--accent-text)', letterSpacing: '0.12em' }}>/now</span>
          <span style={{ color: 'var(--muted)' }}>● updated {lastUpdated} · jakarta</span>
        </div>

        {/* big italic status headline, derives from latest entry */}
        <NowHeadline>
          {nowEntries[0] ? toHeadline(nowEntries[0].body) : 'building things.'}
        </NowHeadline>

        {/* two columns: currently (sidebar) + dated feed */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-10" style={{ marginTop: '3.5rem' }}>
          {/* currently */}
          <div className="md:col-span-4">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>currently</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {nowCurrently.map((c) => (
                <div key={c.id} className="flex items-baseline gap-3" style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', width: 72, flexShrink: 0 }}>{c.key}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--fg)' }}>{c.value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1.5rem' }}>
              a living changelog. not finished essays (those live in{' '}
              <Link href="/blog" style={{ color: 'var(--accent-text)', textDecoration: 'underline', textUnderlineOffset: 3 }}>built &amp; broken</Link>
              ), just what is actually happening.
            </p>
          </div>

          {/* dated feed, newest first */}
          <div className="md:col-span-8">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>the log</div>
            <div style={{ borderTop: '3px solid var(--fg)' }}>
              {nowEntries.map((e) => (
                <div key={e.id} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-x-6 gap-y-1" style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)', paddingTop: 2 }}>{e.date}</div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--fg)' }}>{e.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* cross-links */}
        <div className="flex flex-wrap gap-x-8 gap-y-2" style={{ marginTop: '2.5rem', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <Link href="/projects" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>the work →</Link>
          <Link href="/hub" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>live apps →</Link>
        </div>
      </div>
    </section>
  )
}
