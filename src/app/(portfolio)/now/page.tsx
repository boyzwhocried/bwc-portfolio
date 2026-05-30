import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'now',
  description: 'what i am focused on right now. a living changelog of the platform growing.',
}

// public-safe only: no private plans, no salary. short dated status, newest first.
const ENTRIES: { date: string; body: string }[] = [
  { date: '2026-05-30', body: 'rebuilding this whole site, one room at a time. new design system: swiss backbone, zine soul, eleven distinct rooms.' },
  { date: '2026-05-29', body: 'shipped outreach os, a freelance outreach generator. live and in use.' },
  { date: '2026-05-24', body: 'vault of frights now posts a horror short every day, fully automated end to end.' },
  { date: '2026-05-20', body: 'personal os keeps growing: a wiki plus a telegram bot that runs my life, syncing weekly.' },
  { date: '2026-05-15', body: 'studying for the azure DP-900. data fundamentals, slowly but surely.' },
]

const LAST_UPDATED = '2026-05-30'

export default function NowPage() {
  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <div className="mx-auto px-6" style={{ maxWidth: '44rem', paddingTop: '3.5rem', paddingBottom: '4rem' }}>
        {/* kicker + live updated line */}
        <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span className="uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.12em' }}>/now</span>
          <span style={{ color: 'var(--muted)' }}>● updated {LAST_UPDATED} · jakarta</span>
        </div>

        {/* big italic status headline (the entry gesture) */}
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: 'clamp(1.9rem, 5.5vw, 3rem)',
            lineHeight: 1.1,
            color: 'var(--fg)',
            marginTop: '1.5rem',
          }}
        >
          rebuilding this whole site, one room at a time.
        </h1>

        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1rem' }}>
          a living changelog. not finished essays (those live in{' '}
          <Link href="/blog" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 3 }}>built &amp; broken</Link>
          ), just what is actually happening right now.
        </p>

        {/* dated feed, newest first */}
        <div style={{ marginTop: '3rem', borderTop: '3px solid var(--fg)' }}>
          {ENTRIES.map((e) => (
            <div
              key={e.date}
              className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-x-6 gap-y-1"
              style={{ padding: '1.5rem 0', borderBottom: '1px solid var(--rule)' }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', paddingTop: 2 }}>
                {e.date}
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--fg)' }}>
                {e.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
