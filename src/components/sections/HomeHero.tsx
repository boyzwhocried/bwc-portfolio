'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useDriftIn, useFadeUp } from '@/lib/motion'
import { Project } from '@/types'
import BwcMark from './BwcMark'
import Square from '@/components/ui/Square'
import DriftingSquares from '@/components/ui/DriftingSquares'

const SKILLS = [
  'T-SQL', 'Python', 'TypeScript', 'Next.js', 'Supabase', 'SSIS',
  'SQL Server', 'React', 'Framer Motion', 'Tableau', 'Azure',
]

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

function projType(p: Project): string {
  const t = p.tags ?? []
  if (t.includes('automation')) return 'automation'
  if (t.includes('data-engineering') || t.includes('sql')) return 'data'
  if (t.includes('startup')) return 'startup'
  return (t.filter((x) => x !== 'personal' && x !== 'work')[0]) ?? 'project'
}

export default function HomeHero({ featured }: { featured: Project[] }) {
  const drift = useDriftIn()
  const fade = useFadeUp()
  const reduce = useReducedMotion()

  return (
    <motion.section
      initial="hidden"
      animate="show"
      className="relative overflow-hidden"
      style={{ paddingTop: '3.5rem' }}
    >
      <DriftingSquares variant="home" color="var(--vermilion)" opacity={0.1} count={7} />

      {/* poster: meta + mark + intro, fills the first view */}
      <div style={{ ...frame, position: 'relative', zIndex: 1 }}>
        {/* asymmetric hairline grid (the character) */}
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden style={{ zIndex: 0 }}>
          <div className="absolute top-0 bottom-0" style={{ left: '38%', width: 1, background: 'var(--rule)' }} />
          <div className="absolute top-0 bottom-0" style={{ left: '66%', width: 1, background: 'var(--rule)' }} />
          <div className="absolute top-0 bottom-0" style={{ left: '86%', width: 1, background: 'var(--rule)' }} />
        </div>

        {/* meta row */}
        <div
          className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
          style={{ zIndex: 1, paddingTop: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--rule)', fontFamily: 'var(--font-mono)' }}
        >
          <motion.span custom={0} variants={drift} className="text-[10px] sm:text-xs uppercase whitespace-nowrap" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
            EST. 2024 · JAKARTA, ID
          </motion.span>
          <motion.span custom={1} variants={drift} className="text-[10px] sm:text-xs uppercase whitespace-nowrap" style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}>
            [ SITE v2 · ALWAYS GROWING ]
          </motion.span>
        </div>

        {/* mark + intro */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-y-12 gap-x-8 items-center" style={{ zIndex: 1, minHeight: '58vh', paddingTop: '3rem', paddingBottom: '3rem' }}>
          <motion.div custom={2} variants={drift} className="md:col-span-7 lg:col-span-8">
            <BwcMark />
          </motion.div>

          <motion.div custom={3} variants={drift} className="md:col-span-5 lg:col-span-4">
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
              hey. i&apos;m a data engineer in jakarta who builds systems for a living and for fun.
              this site is a playground and a workshop: finance tools, a wiki that knows my whole
              life, a horror-shorts bot, plus a pile of half-finished experiments i keep poking at.
            </p>

            <p className="mt-6 flex items-center gap-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--fg)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
              <Square size={14} randomTilt />
              i build things &amp; break a few
            </p>

            <p className="mt-4 text-[10px] uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-text)', letterSpacing: '0.08em' }}>
              scroll to dig in ↓
            </p>
          </motion.div>
        </div>
      </div>

      {/* skills ticker, full width */}
      <motion.div custom={4} variants={drift} className="relative" style={{ borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', zIndex: 1 }}>
        <div className="overflow-hidden" style={{ padding: '0.75rem 0' }} aria-hidden>
          {reduce ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ ...frame, fontFamily: 'var(--font-mono)' }}>
              {SKILLS.map((item, i) => (
                <span key={item} className="flex items-center gap-3">
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--muted)' }}>{item}</span>
                  {i < SKILLS.length - 1 && <span style={{ fontSize: 11, color: 'var(--accent)' }}>/</span>}
                </span>
              ))}
            </div>
          ) : (
            <>
              <style>{`
                @keyframes home-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .home-ticker-track { display: flex; width: max-content; animation: home-ticker 36s linear infinite; }
              `}</style>
              <div className="home-ticker-track">
                {[...SKILLS, ...SKILLS, ...SKILLS, ...SKILLS].map((item, i) => (
                  <span key={i} className="flex items-center" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--muted)', padding: '0 1.5rem', whiteSpace: 'nowrap' }}>{item}</span>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>/</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* featured-work band: below-fold, scroll-reveals once */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '4rem', paddingBottom: '2rem' }}
      >
        <div className="flex items-baseline justify-between" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            selected work
          </h2>
          <Link href="/projects" className="transition-opacity hover:opacity-60" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)' }}>
            all work →
          </Link>
        </div>

        <div>
          {featured.slice(0, 3).map((p, i) => (
            <Link
              key={p.id}
              href={`/projects/${p.slug}`}
              className="group grid items-baseline transition-opacity hover:opacity-100"
              style={{ gridTemplateColumns: '40px minmax(0,1fr) auto', gap: 20, paddingTop: 16, paddingBottom: 16, borderBottom: '1px solid var(--rule)', textDecoration: 'none' }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(1.1rem, 2.2vw, 1.5rem)', color: 'var(--fg)' }}>{p.title}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{projType(p)} · {p.year}</span>
            </Link>
          ))}
        </div>

        {/* cross-links to the other rooms (connect the site) */}
        <div className="flex flex-wrap gap-x-8 gap-y-2" style={{ marginTop: '2rem', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <Link href="/hub" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>launch live apps →</Link>
          <Link href="/now" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>what i&apos;m on now →</Link>
          <Link href="/sandbox" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>poke around the sandbox →</Link>
        </div>
      </motion.div>
    </motion.section>
  )
}
