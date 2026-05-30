'use client'

import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

// deterministic PRNG so server + client render identical positions (no hydration mismatch)
function seeded(seedStr: string) {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Passive ambient motion: flat vermilion squares drifting slowly in the background.
 * On-brand replacement for a glowing blob. Varied per page via `variant`.
 * Sits behind content (z-index 0) and ignores pointer + screen-readers.
 */
export default function DriftingSquares({
  variant,
  count = 7,
  color = 'var(--vermilion)',
  opacity = 0.12,
}: {
  variant: string
  count?: number
  color?: string
  opacity?: number
}) {
  const reduce = useReducedMotion()

  const squares = useMemo(() => {
    const rnd = seeded(variant)
    return Array.from({ length: count }, () => {
      const size = 8 + Math.round(rnd() * 30)
      return {
        left: (rnd() * 96).toFixed(2),
        top: (rnd() * 92).toFixed(2),
        size,
        tilt: Math.round((rnd() - 0.5) * 24),
        dx: `${(rnd() - 0.5) * 60}px`,
        dy: `${(rnd() - 0.5) * 60}px`,
        rot: `${Math.round((rnd() - 0.5) * 50)}deg`,
        dur: `${18 + Math.round(rnd() * 26)}s`,
        delay: `-${Math.round(rnd() * 20)}s`,
        op: (0.5 + rnd() * 0.5).toFixed(2),
      }
    })
  }, [variant, count])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {!reduce && (
        <style>{`
          @keyframes sqDrift {
            0%, 100% { transform: translate(0,0) rotate(var(--sq-tilt)); }
            50% { transform: translate(var(--sq-dx), var(--sq-dy)) rotate(calc(var(--sq-tilt) + var(--sq-rot))); }
          }
        `}</style>
      )}
      {squares.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: color,
            opacity: opacity * Number(s.op),
            // CSS custom props consumed by the keyframe
            ['--sq-tilt' as string]: `${s.tilt}deg`,
            ['--sq-dx' as string]: s.dx,
            ['--sq-dy' as string]: s.dy,
            ['--sq-rot' as string]: s.rot,
            transform: `rotate(${s.tilt}deg)`,
            animation: reduce ? undefined : `sqDrift ${s.dur} ease-in-out ${s.delay} infinite`,
            willChange: reduce ? undefined : 'transform',
          }}
        />
      ))}
    </div>
  )
}
