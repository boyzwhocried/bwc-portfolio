import { Metadata } from 'next'
import Link from 'next/link'
import DriftingSquares from '@/components/ui/DriftingSquares'

export const metadata: Metadata = {
  title: 'now',
  description: 'what i am focused on right now. a living changelog of the platform growing.',
}

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

// public-safe only: no private plans, no salary. short dated status, newest first.
const ENTRIES: { date: string; body: string }[] = [
  { date: '2026-05-30', body: 'rebuilding this whole site, one room at a time. new design system: swiss backbone, zine soul, eleven distinct rooms, plus an orange-square mascot.' },
  { date: '2026-05-29', body: 'shipped outreach os, a freelance outreach generator. live and in use.' },
  { date: '2026-05-24', body: 'vault of frights now posts a horror short every day, fully automated end to end.' },
  { date: '2026-05-20', body: 'personal os keeps growing: a wiki plus a telegram bot that runs my life, syncing weekly.' },
  { date: '2026-05-15', body: 'studying for the azure DP-900. data fundamentals, slowly but surely.' },
]

const CURRENTLY = [
  { k: 'building', v: 'this site, v2' },
  { k: 'learning', v: 'azure DP-900' },
  { k: 'listening', v: 'whatever the footer says' },
  { k: 'shipping', v: 'more than sleeping' },
]

const LAST_UPDATED = '2026-05-30'

export default function NowPage() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="now" color="var(--vermilion)" opacity={0.09} count={6} />

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3.5rem', paddingBottom: '2rem' }}>
        {/* kicker + live updated line */}
        <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span className="uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>/now</span>
          <span style={{ color: 'var(--muted)' }}>● updated {LAST_UPDATED} · jakarta</span>
        </div>

        {/* big italic status headline (the entry gesture) */}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(2.2rem, 6vw, 4rem)', lineHeight: 1.05, color: 'var(--fg)', marginTop: '1.5rem', maxWidth: '20ch' }}>
          rebuilding this whole site, one room at a time.
        </h1>

        {/* two columns: currently (sidebar) + dated feed */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-10" style={{ marginTop: '3.5rem' }}>
          {/* currently */}
          <div className="md:col-span-4">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>currently</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {CURRENTLY.map((c) => (
                <div key={c.k} className="flex items-baseline gap-3" style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', width: 72, flexShrink: 0 }}>{c.k}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--fg)' }}>{c.v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1.5rem' }}>
              a living changelog. not finished essays (those live in{' '}
              <Link href="/blog" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>built &amp; broken</Link>
              ), just what is actually happening.
            </p>
          </div>

          {/* dated feed, newest first */}
          <div className="md:col-span-8">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>the log</div>
            <div style={{ borderTop: '3px solid var(--fg)' }}>
              {ENTRIES.map((e) => (
                <div key={e.date} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-x-6 gap-y-1" style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--rule)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', paddingTop: 2 }}>{e.date}</div>
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
