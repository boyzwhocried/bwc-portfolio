'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Project } from '@/types'

// filter keys a project matches (a project can match several)
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

// the meta whisper on the right: 2 most-specific tags + year
function metaLine(p: Project): string {
  const tags = (p.tags ?? []).filter((t) => t !== 'personal' && t !== 'work').slice(0, 2)
  return [...tags, p.year].filter(Boolean).join(' · ')
}

const FILTER_ORDER = ['all', 'automation', 'data', 'startup', 'freelance', 'archived'] as const

export default function ProjectIndex({ projects }: { projects: Project[] }) {
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState<string>('all')

  // only show a chip if at least one project matches it (all always shown)
  const available = FILTER_ORDER.filter(
    (f) => f === 'all' || projects.some((p) => matchKeys(p).includes(f)),
  )

  const shown = filter === 'all' ? projects : projects.filter((p) => matchKeys(p).includes(filter))

  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <style>{`
        .proj-row { transition: background .2s ease, transform .2s ease; }
        .proj-row:hover { background: linear-gradient(90deg, rgba(26,26,26,0.06), transparent); transform: translateX(4px); }
        @media (prefers-reduced-motion: reduce) { .proj-row:hover { transform: none; } }
      `}</style>

      {/* no hero: straight to the index. compact header sits right under the nav */}
      <div
        className="mx-auto px-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2"
        style={{ maxWidth: '64rem', paddingTop: '3rem' }}
      >
        <div className="flex items-baseline gap-3">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.9rem, 4.5vw, 2.4rem)',
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            selected work
          </h1>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
            {String(projects.length).padStart(2, '0')} projects
          </span>
        </div>

        {/* filter chips (monochrome: ink, no vermilion on the index) */}
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          {available.map((f, i) => (
            <span key={f} className="flex items-center gap-2">
              <button
                onClick={() => setFilter(f)}
                style={{
                  color: filter === f ? 'var(--fg)' : 'var(--muted)',
                  fontWeight: filter === f ? 700 : 400,
                  textDecoration: filter === f ? 'underline' : 'none',
                  textUnderlineOffset: 3,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? '[ all ]' : f}
              </button>
              {i < available.length - 1 && <span style={{ color: 'var(--muted)' }}>·</span>}
            </span>
          ))}
        </div>
      </div>

      {/* index rows */}
      <div className="mx-auto px-6" style={{ maxWidth: '64rem', marginTop: '2.5rem', paddingBottom: '4rem' }}>
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
                className="proj-row flex items-baseline justify-between gap-4 px-3"
                style={{
                  paddingTop: 14,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--fg)',
                  opacity: archived ? 0.55 : 1,
                  textDecoration: 'none',
                }}
              >
                <span className="flex items-baseline gap-4 min-w-0">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="truncate"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
                      color: 'var(--fg)',
                    }}
                  >
                    {p.title}
                  </span>
                </span>
                <span
                  className="flex-shrink-0"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}
                >
                  {archived ? 'archived · ' : ''}
                  {metaLine(p)}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
