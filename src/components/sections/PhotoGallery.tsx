'use client'

import { motion } from 'framer-motion'
import { useFadeUp } from '@/lib/motion'

// no real photos exist yet. honest empty state holds the page frame until they do.
// when real frames land in public/photography/, restore the gallery (gridded <img> set).
export default function PhotoGallery() {
  const fade = useFadeUp()

  return (
    <section style={{ paddingTop: '3.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* full-bleed main area: honest empty state, no fabricated photos or EXIF */}
      <div style={{ position: 'relative', flex: 1, minHeight: '60vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '0 1.5rem', maxWidth: '32rem' }}>
          <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent-text)', letterSpacing: '0.12em' }}>
            /photography
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              marginTop: '0.75rem',
            }}
          >
            nothing developed yet
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginTop: '1rem', lineHeight: 1.6 }}>
            the frames will hang here once they exist. no stock, no fakes, just an empty wall for now.
          </p>
        </div>

        {/* counter, upper-right: honest zero */}
        <div style={{ position: 'absolute', right: '5%', top: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          00 / 00
        </div>
      </div>

      {/* film-strip rail kept as the layout frame, empty (no fabricated thumbnails) */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="flex items-center"
        style={{ padding: '0.9rem 5%', borderTop: '1px solid var(--rule)' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>
          film strip empty · check back later
        </span>
      </motion.div>
    </section>
  )
}
