'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { MusicData } from '@/types'
import { buildObsessionReport } from '@/lib/music/obsession'
import { useFadeUp } from '@/lib/motion'

// "the read": a deterministic narrative about the listener, assembled by
// src/lib/music/obsession.ts from the same cached data the rest of the room
// renders. Machine-read, not hand-written; no LLM involved. Third person on
// purpose: it talks to the visitor about him.

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  color: 'var(--muted)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

export default function MusicObsession({ music }: { music: MusicData }) {
  const fade = useFadeUp()
  const report = useMemo(() => buildObsessionReport(music), [music])
  if (!report) return null

  return (
    <motion.div
      variants={fade}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4" style={{ marginBottom: '1.75rem' }}>
        <div style={labelStyle}>the read</div>
        <div style={{ ...labelStyle, textTransform: 'none', letterSpacing: '0.04em' }}>
          machine-read from the listening data, not hand-written
        </div>
      </div>

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(1.8rem, 4.5vw, 3rem)',
          lineHeight: 0.95,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
          maxWidth: '24ch',
        }}
      >
        {report.headline}
      </h2>

      {/* stat placard: the computed facts in one mono strip */}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          lineHeight: 1.9,
          color: 'var(--accent-text)',
          letterSpacing: '0.02em',
          marginTop: '1.25rem',
          maxWidth: '72ch',
        }}
      >
        {report.placard.join(' · ')}
      </p>

      <div style={{ marginTop: '1.5rem', maxWidth: '62ch' }}>
        {report.paragraphs.map((p, i) => (
          <p
            key={i}
            style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--fg)', marginTop: i === 0 ? 0 : '0.9rem' }}
          >
            {p}
          </p>
        ))}
      </div>

      {report.titles.length > 0 && (
        <p
          style={{
            fontSize: 13,
            fontStyle: 'italic',
            lineHeight: 1.8,
            color: 'var(--muted)',
            marginTop: '1.5rem',
            maxWidth: '70ch',
          }}
        >
          <span style={{ ...labelStyle, fontStyle: 'normal', marginRight: 10 }}>the titles alone</span>
          {report.titles.join(' · ')}
        </p>
      )}
    </motion.div>
  )
}
