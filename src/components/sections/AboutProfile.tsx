'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useDriftIn, useFadeUp, ease, dur } from '@/lib/motion'
import DriftingSquares from '@/components/ui/DriftingSquares'

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

// the journey, public-safe (no german plan, no salary). third-person about-voice.
const THROUGHLINE = [
  { year: '2017', body: 'started in mechatronics, fixing CNC machines on a factory floor and wiring an alert system so the machines could tell on themselves.' },
  { year: '2021', body: 'pivoted to software at binus. turns out taking things apart and putting them back together works the same whether it is a machine or a system.' },
  { year: '2024', body: 'became a data engineer, building warehouses and ETL pipelines that have to be correct, idempotent, and quietly run themselves every night.' },
  { year: 'now', body: 'started pointing the same habit at his own life: a wiki that remembers everything, a bot that runs the day, a channel that writes and uploads horror on its own.' },
]

export default function AboutProfile() {
  const drift = useDriftIn()
  const fade = useFadeUp()
  const reduce = useReducedMotion()

  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="about" color="var(--paper)" opacity={0.05} count={6} />

      {/* centered, narrow, intimate hero (the entry gesture) */}
      <motion.div initial="hidden" animate="show" style={{ ...frame, position: 'relative', zIndex: 1 }}>
        <div className="mx-auto text-center" style={{ maxWidth: '40rem', paddingTop: '4rem', paddingBottom: '2rem' }}>
          <motion.p custom={0} variants={drift} className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}>
            PROFILE · No. 01 / the person behind bwc
          </motion.p>

          <motion.h1 custom={1} variants={drift} className="mx-auto" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5.5vw, 2.75rem)', lineHeight: 0.98, letterSpacing: '-0.02em', marginTop: '0.9rem', maxWidth: '20ch', color: 'var(--fg)' }}>
            the guy who automates things nobody asked him to
          </motion.h1>

          <motion.div custom={2} variants={drift} className="mx-auto" style={{ width: '15rem', marginTop: '2.5rem' }}>
            <div aria-label="portrait of verrel (placeholder, real photo pending)" style={{ width: '100%', aspectRatio: '4 / 5', border: '1px solid var(--fg)', background: 'linear-gradient(135deg, #2b2b2b, #1f1f1f)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>[ verrel.jpg ]</span>
              <span style={{ position: 'absolute', bottom: 6, left: 6, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)' }}>JAKARTA, 2026</span>
            </div>
            <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: '0.5rem', letterSpacing: '0.06em' }}>
              VERREL ALSYOUMI · data engineer, tinkerer
            </p>
          </motion.div>

          <motion.div custom={3} variants={drift} aria-hidden className="mx-auto flex items-center justify-center gap-2" style={{ marginTop: '2.25rem' }}>
            <span style={{ width: 28, height: 1, background: 'var(--rule)' }} />
            <span style={{ width: 6, height: 6, background: 'var(--accent)', transform: 'rotate(45deg)' }} />
            <span style={{ width: 28, height: 1, background: 'var(--rule)' }} />
          </motion.div>

          <motion.p custom={4} variants={drift} className="mx-auto" style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg)', marginTop: '2rem', maxWidth: '34rem' }}>
            verrel builds systems most people would not bother building. a data engineer by trade, he
            spends his days wiring data warehouses, and his nights teaching a wiki to remember his
            entire life and running a horror-shorts bot that writes and uploads itself.
          </motion.p>

          <motion.p custom={5} variants={drift} className="mx-auto" style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1rem', maxWidth: '32rem' }}>
            he&apos;ll automate a five-minute task with a three-day script and call it a win. he
            probably is winning, actually.
          </motion.p>
        </div>
      </motion.div>

      {/* the through-line: wider editorial timeline (fills the void with real story) */}
      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3rem', paddingBottom: '2rem' }}>
        <motion.div variants={fade} initial="hidden" animate="show"
          className="uppercase" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, letterSpacing: '0.12em', color: 'var(--fg)', borderBottom: '1px solid var(--rule)', paddingBottom: 10, marginBottom: '2rem' }}>
          ↓ the through-line
        </motion.div>

        {/* spine + grid wrapper (relative so spine is scoped to this block) */}
        <div style={{ position: 'relative' }}>
          {/* vertical through-line spine: draws itself on scroll-reveal */}
          <motion.div
            aria-hidden
            initial={reduce ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: dur.slow, ease: ease.out }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 1,
              height: '100%',
              background: 'var(--accent)',
              transformOrigin: 'top',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6" style={{ maxWidth: '60rem', paddingLeft: 16 }}>
            {THROUGHLINE.map((t) => (
              <motion.div key={t.year} variants={fade} initial="hidden" animate="show"
                className="grid" style={{ gridTemplateColumns: '64px 1fr', gap: 16, paddingBottom: '1rem', borderBottom: '1px solid var(--rule)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{t.year}</span>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>{t.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* system-note (safe-public) + cross-links */}
        <motion.div variants={fade} initial="hidden" animate="show"
          className="flex flex-wrap items-center justify-between gap-4" style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--rule)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            currently: prepping DP-900, building this site in public, shipping more than sleeping.
          </span>
          <span className="flex gap-6">
            <Link href="/cv" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>the cv →</Link>
            <Link href="/contact" className="transition-opacity hover:opacity-60" style={{ color: 'var(--fg)' }}>say hi →</Link>
          </span>
        </motion.div>
      </div>
    </section>
  )
}
