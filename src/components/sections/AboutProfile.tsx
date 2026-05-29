'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useDriftIn } from '@/lib/motion'

export default function AboutProfile() {
  const drift = useDriftIn()
  const reduce = useReducedMotion()

  // scroll-fade for the lower narrative blocks; collapses to instant under reduced-motion
  const fadeUp = reduce
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
      }

  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      {/* centered + narrow editorial column (the entry gesture: symmetric, intimate) */}
      <motion.div
        initial="hidden"
        animate="show"
        className="mx-auto px-6 text-center"
        style={{ maxWidth: '40rem', paddingTop: '4.5rem', paddingBottom: '2rem' }}
      >
        {/* kicker */}
        <motion.p
          custom={0}
          variants={drift}
          className="uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: '0.12em',
          }}
        >
          PROFILE · No. 01 / the person behind bwc
        </motion.p>

        {/* headline (Clash) */}
        <motion.h1
          custom={1}
          variants={drift}
          className="mx-auto"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(2rem, 5.5vw, 2.75rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            marginTop: '0.9rem',
            maxWidth: '20ch',
            color: 'var(--fg)',
          }}
        >
          the guy who automates things nobody asked him to
        </motion.h1>

        {/* portrait-first: face slot centered ABOVE the text (4:5, bordered) */}
        <motion.div custom={2} variants={drift} className="mx-auto" style={{ width: '15rem', marginTop: '2.5rem' }}>
          <div
            aria-label="portrait of verrel (placeholder, real photo pending)"
            style={{
              width: '100%',
              aspectRatio: '4 / 5',
              border: '1px solid var(--fg)',
              background: 'linear-gradient(135deg, #2b2b2b, #1f1f1f)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
              [ verrel.jpg ]
            </span>
            <span
              style={{
                position: 'absolute',
                bottom: 6,
                left: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                color: 'var(--muted)',
              }}
            >
              JAKARTA, 2026
            </span>
          </div>
          {/* the one place the real name lives */}
          <p
            className="uppercase"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: '0.5rem', letterSpacing: '0.06em' }}
          >
            VERREL ALSYOUMI · data engineer, tinkerer
          </p>
        </motion.div>

        {/* small vermilion divider mark (personality, replaces the dropped drop-cap V) */}
        <motion.div
          custom={3}
          variants={drift}
          aria-hidden
          className="mx-auto flex items-center justify-center gap-2"
          style={{ marginTop: '2.25rem' }}
        >
          <span style={{ width: 28, height: 1, background: 'var(--rule)' }} />
          <span style={{ width: 6, height: 6, background: 'var(--accent)', transform: 'rotate(45deg)' }} />
          <span style={{ width: 28, height: 1, background: 'var(--rule)' }} />
        </motion.div>

        {/* lede (General Sans) */}
        <motion.p
          custom={4}
          variants={drift}
          className="mx-auto"
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            color: 'var(--fg)',
            marginTop: '2rem',
            maxWidth: '34rem',
          }}
        >
          verrel builds systems most people would not bother building. a data engineer by trade, he
          spends his days wiring data warehouses, and his nights teaching a wiki to remember his
          entire life and running a horror-shorts bot that writes and uploads itself.
        </motion.p>

        {/* the wry-friend line */}
        <motion.p
          custom={5}
          variants={drift}
          className="mx-auto"
          style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1rem', maxWidth: '32rem' }}
        >
          he&apos;ll automate a five-minute task with a three-day script and call it a win. he
          probably is winning, actually.
        </motion.p>
      </motion.div>

      {/* lower blocks: system-note + through-line, stacked centered in the narrow column */}
      <div className="mx-auto px-6" style={{ maxWidth: '40rem', paddingBottom: '4rem' }}>
        {/* margin system-note (safe-public items ONLY) */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto"
          style={{
            borderLeft: '2px solid var(--accent)',
            paddingLeft: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            lineHeight: 1.6,
            color: 'var(--muted)',
            maxWidth: '30rem',
            marginTop: '1rem',
            textAlign: 'left',
          }}
        >
          currently: prepping DP-900, building this site in public, shipping more than sleeping.
        </motion.div>

        {/* through-line section marker */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto"
          style={{ maxWidth: '30rem', marginTop: '2.5rem', textAlign: 'left' }}
        >
          <div
            className="uppercase"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.12em',
              color: 'var(--fg)',
              borderBottom: '1px solid var(--rule)',
              paddingBottom: 5,
              marginBottom: 7,
            }}
          >
            ↓ the through-line
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>
            how a kid who liked taking things apart became someone who builds them on purpose. (the
            rest of the story scrolls from here.)
          </p>
        </motion.div>
      </div>
    </section>
  )
}
