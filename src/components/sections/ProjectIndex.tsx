'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Project } from '@/types'
import DriftingSquares from '@/components/ui/DriftingSquares'

function matchKeys(p: Project): string[] {
  const keys: string[] = []
  const t = p.tags ?? []
  if (t.includes('automation')) keys.push('automation')
  if (t.includes('data-engineering') || t.includes('data') || t.includes('sql')) keys.push('data')
  if (t.includes('startup')) keys.push('startup')
  if (t.includes('freelance')) keys.push('freelance')
  if (p.status === 'archived') keys.push('archived')
  return keys
}

// one primary type label for the TYPE column
function primaryType(p: Project): string {
  if (p.status === 'archived') return 'archived'
  const k = matchKeys(p).filter((x) => x !== 'archived')
  if (k.length) return k[0]
  const t = (p.tags ?? []).filter((x) => x !== 'personal' && x !== 'work')
  return t[0] ?? 'project'
}

function stackLine(p: Project): string {
  return (p.tech_stack ?? []).slice(0, 3).join(' · ')
}

const FILTER_ORDER = ['all', 'automation', 'data', 'startup', 'freelance', 'archived'] as const
const GRID = '40px minmax(0,1fr) 150px 300px 56px'

export default function ProjectIndex({ projects }: { projects: Project[] }) {
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState<string>('all')

  const available = FILTER_ORDER.filter(
    (f) => f === 'all' || projects.some((p) => matchKeys(p).includes(f)),
  )
  const shown = filter === 'all' ? projects : projects.filter((p) => matchKeys(p).includes(filter))

  return (
    <section style={{ position: 'relative', paddingTop: '3.5rem', overflow: 'hidden' }}>
      <DriftingSquares variant="projects" color="var(--accent)" opacity={0.12} count={9} />

      <style>{`
        .proj-row { position: relative; transition: background .2s ease, transform .2s ease; }
        .proj-row::before {
          content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
          background: #e84c28; transform: scaleY(0); transform-origin: center; transition: transform .2s ease;
        }
        .proj-row:hover { background: linear-gradient(90deg, rgba(232,76,40,0.06), transparent); transform: translateX(4px); }
        .proj-row:hover::before { transform: scaleY(1); }
        @media (prefers-reduced-motion: reduce) { .proj-row:hover { transform: none; } .proj-row::before { transition: none; } }
      `}</style>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 'var(--page-max)',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: 'var(--page-px)',
          paddingRight: 'var(--page-px)',
          paddingTop: '3rem',
          paddingBottom: '5rem',
          minHeight: 'calc(100vh - 3.5rem)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header: title + filters, full width */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <div className="flex items-baseline gap-3">
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', letterSpacing: '-0.03em', color: 'var(--fg)' }}>
              selected work
            </h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
              {String(projects.length).padStart(2, '0')} projects
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {available.map((f, i) => (
              <span key={f} className="flex items-center gap-2">
                <button
                  onClick={() => setFilter(f)}
                  style={{
                    color: filter === f ? 'var(--fg)' : 'var(--muted)',
                    fontWeight: filter === f ? 700 : 400,
                    textDecoration: filter === f ? 'underline' : 'none',
                    textUnderlineOffset: 3,
                    background: 'none', border: 'none', cursor: 'pointer',
                    // a11y target-size: >=24px tap target without changing the text size
                    minHeight: 24, minWidth: 24, padding: '0 4px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {f === 'all' ? '[ all ]' : f}
                </button>
                {i < available.length - 1 && <span style={{ color: 'var(--muted)' }}>·</span>}
              </span>
            ))}
          </div>
        </div>

        {/* table header row (desktop) */}
        <div
          className="hidden md:grid uppercase"
          style={{ gridTemplateColumns: GRID, gap: 20, marginTop: '2.5rem', paddingBottom: 8, borderBottom: '2px solid var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--muted)' }}
        >
          <span>#</span><span>project</span><span>type</span><span>stack</span><span style={{ textAlign: 'right' }}>year</span>
        </div>

        {/* rows */}
        <div style={{ flex: 1 }}>
          {shown.map((p, i) => {
            const archived = p.status === 'archived'
            return (
              <motion.div
                key={p.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href={`/projects/${p.slug}`}
                  className="proj-row grid items-baseline px-3 grid-cols-[40px_minmax(0,1fr)_56px] md:grid-cols-[40px_minmax(0,1fr)_150px_300px_56px]"
                  style={{
                    gap: 20,
                    paddingTop: 16,
                    paddingBottom: 16,
                    borderBottom: '1px solid var(--rule)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(1.2rem, 2.4vw, 1.6rem)', color: archived ? 'var(--muted)' : 'var(--fg)' }}>
                    {p.title}
                  </span>
                  <span className="hidden md:block truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {primaryType(p)}
                  </span>
                  <span className="hidden md:block truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                    {stackLine(p)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', textAlign: 'right' }}>
                    {p.year ?? ''}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* bottom cross-link block: fills the void + connects rooms */}
        <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--rule)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>the index keeps growing. this is the showcase, not the launcher.</span>
          <span className="flex gap-6">
            <Link href="/hub" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>launch live apps →</Link>
            <Link href="/now" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>what i&apos;m on now →</Link>
          </span>
        </div>
      </div>
    </section>
  )
}
