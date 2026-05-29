'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useDriftIn } from '@/lib/motion'
import BwcMark from './BwcMark'

const SKILLS = [
  'T-SQL',
  'Python',
  'TypeScript',
  'Next.js',
  'Supabase',
  'SSIS',
  'SQL Server',
  'React',
  'Framer Motion',
  'Tableau',
  'Azure',
]

export default function HomeHero() {
  const drift = useDriftIn()
  const reduce = useReducedMotion()

  return (
    <motion.section
      initial="hidden"
      animate="show"
      className="relative min-h-screen overflow-hidden"
      style={{ paddingTop: '3.5rem' }}
    >
      {/* visible hairline grid lines, left-weighted (anti-generic requirement) */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute top-0 bottom-0"
          style={{ left: '8%', width: 1, background: 'var(--rule)' }}
        />
        <div
          className="absolute top-0 bottom-0 hidden md:block"
          style={{ left: '38%', width: 1, background: 'var(--rule)' }}
        />
        <div
          className="absolute top-0 bottom-0 hidden md:block"
          style={{ left: '68%', width: 1, background: 'var(--rule)' }}
        />
        <div
          className="absolute left-0 right-0"
          style={{ top: '7rem', height: 1, background: 'var(--rule)' }}
        />
      </div>

      {/* top meta row */}
      <div
        className="relative flex items-center justify-between"
        style={{
          paddingLeft: '8%',
          paddingRight: '5%',
          paddingTop: '2rem',
          height: '5rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <motion.span
          custom={0}
          variants={drift}
          className="text-[10px] sm:text-xs uppercase"
          style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
        >
          EST. 2024 · JAKARTA, ID
        </motion.span>
        <motion.span
          custom={1}
          variants={drift}
          className="text-[10px] sm:text-xs uppercase"
          style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
        >
          [ SITE v2 · ALWAYS GROWING ]
        </motion.span>
      </div>

      {/* main poster row: mark left-weighted, warm intro top-right */}
      <div
        className="relative grid grid-cols-1 md:grid-cols-12 gap-y-12"
        style={{ paddingLeft: '8%', paddingRight: '5%', paddingTop: '3rem', paddingBottom: '6rem' }}
      >
        {/* the alive mark, top-left */}
        <motion.div custom={2} variants={drift} className="md:col-span-7 lg:col-span-8">
          <BwcMark />
        </motion.div>

        {/* warm justified intro column, top-right */}
        <motion.div
          custom={3}
          variants={drift}
          className="md:col-span-5 lg:col-span-4 md:pl-8"
        >
          <p
            className="text-sm leading-relaxed text-left"
            style={{ color: 'var(--fg)', textAlign: 'justify' }}
          >
            <span
              className="float-left"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--accent)',
                fontSize: '3.4rem',
                lineHeight: 0.7,
                fontWeight: 700,
                marginRight: '0.5rem',
                marginTop: '0.25rem',
                transform: 'rotate(-2.5deg)',
                display: 'inline-block',
              }}
            >
              h
            </span>
            ey. i&apos;m a data engineer in jakarta who builds systems for a living and for
            fun. this site is a playground and a workshop: finance tools, a wiki that knows my
            whole life, a horror-shorts bot, plus a pile of half-finished experiments i keep
            poking at.
          </p>

          <p
            className="mt-6 text-base"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
            }}
          >
            i build things &amp; break a few
          </p>

          <p
            className="mt-4 text-[10px] uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.08em' }}
          >
            scroll to dig in ↓
          </p>
        </motion.div>
      </div>

      {/* skills ticker low on the page */}
      <motion.div
        custom={4}
        variants={drift}
        className="relative"
        style={{ borderTop: '1px solid var(--rule)' }}
      >
        <div className="overflow-hidden" style={{ padding: '0.75rem 0' }} aria-hidden>
          {reduce ? (
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-[8%]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {SKILLS.map((item, i) => (
                <span key={item} className="flex items-center gap-3">
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--muted)' }}>
                    {item}
                  </span>
                  {i < SKILLS.length - 1 && (
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>/</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <>
              <style>{`
                @keyframes home-ticker {
                  from { transform: translateX(0); }
                  to { transform: translateX(-50%); }
                }
                .home-ticker-track {
                  display: flex;
                  width: max-content;
                  animation: home-ticker 32s linear infinite;
                }
              `}</style>
              <div className="home-ticker-track">
                {[...SKILLS, ...SKILLS].map((item, i) => (
                  <span
                    key={i}
                    className="flex items-center"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 300,
                        color: 'var(--muted)',
                        padding: '0 0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>/</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.section>
  )
}
