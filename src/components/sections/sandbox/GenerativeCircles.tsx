'use client'

import { useEffect, useState } from 'react'

// a real generative toy: each click recomposes the piece. ink outlines,
// vermilion fills, one paper accent — the house palette, recombined forever.
type Circle = {
  cx: number; cy: number; r: number
  kind: 'ink-line' | 'verm-line' | 'verm-fill' | 'ink-fill'
}

function compose(): Circle[] {
  const n = 3 + Math.floor(Math.random() * 5)
  const kinds: Circle['kind'][] = ['ink-line', 'verm-line', 'verm-fill', 'ink-fill']
  const out: Circle[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      cx: 15 + Math.random() * 70,
      cy: 15 + Math.random() * 70,
      r: 4 + Math.random() * 26,
      kind: kinds[Math.floor(Math.random() * (i === 0 ? 2 : kinds.length))],
    })
  }
  return out
}

export default function GenerativeCircles() {
  // SSR-stable first paint (empty), first composition deferred post-mount;
  // every click recomposes directly in the event handler.
  const [circles, setCircles] = useState<Circle[]>([])
  const [gen, setGen] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setCircles(compose()), 0)
    return () => clearTimeout(t0)
  }, [])

  return (
    <button
      onClick={() => { setCircles(compose()); setGen((g) => g + 1) }}
      aria-label="regenerate the circle composition"
      style={{ display: 'block', width: 110, height: 110, borderRadius: '50%', background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: '4px 4px 0 #b3ada0', overflow: 'hidden', cursor: 'pointer', padding: 0 }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden>
        {circles.map((c, i) => (
          <circle
            key={`${gen}-${i}`}
            cx={c.cx} cy={c.cy} r={c.r}
            fill={c.kind === 'verm-fill' ? 'var(--vermilion)' : c.kind === 'ink-fill' ? 'var(--ink)' : 'none'}
            stroke={c.kind === 'ink-line' ? 'var(--ink)' : c.kind === 'verm-line' ? 'var(--vermilion)' : 'none'}
            strokeWidth="1.5"
            opacity={c.kind === 'ink-fill' ? 0.85 : 1}
          />
        ))}
      </svg>
    </button>
  )
}
