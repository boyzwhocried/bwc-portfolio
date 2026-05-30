'use client'

import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import useIsTouch from '@/lib/useIsTouch'

const LETTERS = ['b', 'w', 'c'] as const

// per-letter horizontal weighting so the echo fans out from the pointer
const LETTER_BIAS = [-1, 0, 1] as const

export default function BwcMark() {
  const reduce = useReducedMotion()
  const touch = useIsTouch()
  const blockRef = useRef<HTMLDivElement>(null)
  // pointer offset from the mark center, normalized to roughly [-1, 1]
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  function handleMove(e: React.PointerEvent) {
    if (reduce || touch) return
    const el = blockRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    // normalize against half the mark size, clamp to keep the shift subtle
    const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2)))
    const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2)))
    setOffset({ x: nx, y: ny })
    setActive(true)
  }

  function handleLeave() {
    setOffset({ x: 0, y: 0 })
    setActive(false)
  }

  // closeness drives the color lerp toward vermilion; pointer near center = hotter
  const heat = active && !reduce ? Math.max(0, 1 - Math.hypot(offset.x, offset.y) / 1.4) : 0

  return (
    <div
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="inline-block select-none"
      style={{ transform: 'rotate(-2deg)', transformOrigin: 'left top' }}
    >
      {/* screen-reader-readable brand name; the visual letters are decorative */}
      <span className="sr-only">boyzwhocried</span>

      <div
        ref={blockRef}
        id="hero-mark"
        aria-hidden
        className="inline-flex"
        style={{
          background: 'var(--fg)',
          padding: '0 0.12em',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(5rem, 16vw, 11rem)',
          lineHeight: 0.82,
          letterSpacing: '-0.06em',
        }}
      >
        {LETTERS.map((ch, i) => {
          // each letter translates a little, weighted by its position, so the
          // word echoes/shifts toward the pointer instead of moving as one block
          const bias = LETTER_BIAS[i]
          const tx = reduce ? 0 : offset.x * (6 + Math.abs(bias) * 5) + bias * heat * 4
          const ty = reduce ? 0 : offset.y * 4
          // letters closest to the pointer push hardest toward vermilion
          const letterHeat = Math.max(0, heat - Math.abs(offset.x - bias * 0.5) * 0.25)
          return (
            <motion.span
              key={ch}
              animate={{
                x: tx,
                y: ty,
                color: `color-mix(in srgb, var(--accent) ${Math.round(
                  letterHeat * 100,
                )}%, var(--bg))`,
              }}
              transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.5 }}
              style={{ display: 'inline-block', color: 'var(--bg)' }}
            >
              {ch}
            </motion.span>
          )
        })}
      </div>

      {/* hand-scrawled mono tag near the block */}
      <div
        aria-hidden
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'clamp(0.7rem, 1.6vw, 0.85rem)',
          color: 'var(--accent-text)',
          marginTop: '0.9rem',
          marginLeft: '0.4rem',
          transform: 'rotate(0.6deg)',
        }}
      >
        {'// boyz who cried'}
      </div>
    </div>
  )
}
