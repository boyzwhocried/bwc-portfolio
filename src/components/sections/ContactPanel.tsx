'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// the panel is its own color island: hard ink-on-vermilion (the established AA-safe combo).
// it does NOT use the room tokens, which now ride the calm paper base.
const INK = '#1a1a1a'
const VERMILION = '#e84c28'

const EMAIL = 'verrel.alsyoumi@gmail.com'

export default function ContactPanel() {
  const reduce = useReducedMotion()
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(EMAIL).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
      () => {},
    )
  }

  return (
    <motion.aside
      initial={reduce ? false : { clipPath: 'inset(0 0 0 100%)' }}
      animate={{ clipPath: 'inset(0 0 0 0%)' }}
      transition={{ duration: dur.slow, ease: ease.out, delay: 0.1 }}
      style={{
        background: VERMILION,
        color: INK,
        padding: 'clamp(1.75rem, 4vw, 3rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '2.5rem',
        minHeight: '24rem',
        height: '100%',
      }}
    >
      {/* the email, the focal CTA */}
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: INK, marginBottom: '0.9rem' }}>
          or just email me
        </p>
        <button
          onClick={copy}
          aria-label={`copy email address ${EMAIL}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.25rem, 3vw, 2.1rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: INK,
            background: 'none',
            border: 'none',
            borderBottom: `3px solid ${INK}`,
            cursor: 'pointer',
            padding: '0 0 4px',
            textAlign: 'left',
            wordBreak: 'break-word',
          }}
        >
          {copied ? 'copied to clipboard' : EMAIL}
        </button>
      </div>

      {/* socials + locale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: INK, marginBottom: '0.6rem' }}>
            elsewhere
          </p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: INK, borderBottom: `1px solid ${INK}` }}>github</a>
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: INK, borderBottom: `1px solid ${INK}` }}>linkedin</a>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: INK }}>
          jakarta, GMT+7
        </p>
      </div>
    </motion.aside>
  )
}
