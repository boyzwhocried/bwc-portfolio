'use client'

import useRandomTilt from '@/lib/useRandomTilt'

// the crooked vermilion drop-cap on the first paragraph of a case study. the
// tilt is randomized per page load (same hand-placed feel as the brand squares),
// replacing the old hardcoded rotate(-2.5deg).
export default function DropCap({ char, color }: { char: string; color: string }) {
  const tilt = useRandomTilt()
  return (
    <span
      aria-hidden
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '3.2rem',
        lineHeight: 0.7,
        color,
        float: 'left',
        margin: '6px 10px 0 0',
        transform: `rotate(${tilt}deg)`,
        display: 'inline-block',
      }}
    >
      {char}
    </span>
  )
}
