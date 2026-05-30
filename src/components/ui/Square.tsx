'use client'

import useRandomTilt from '@/lib/useRandomTilt'

// the brand atom: a flat square that follows the room accent. used as bullet
// ticks, section marks, the nav lockup, loading dots, and the drifting ambient
// layer. defaults to --accent so it stays visible in rooms that suppress
// vermilion (e.g. contact's vermilion flood, projects' monochrome); pass an
// explicit color to override. pass randomTilt for a fresh hand-placed lean each
// page load (overrides a fixed tilt).
export default function Square({
  size = 10,
  color = 'var(--accent)',
  tilt = 0,
  randomTilt = false,
  className,
  style,
}: {
  size?: number
  color?: string
  tilt?: number
  randomTilt?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const random = useRandomTilt()
  const t = randomTilt ? random : tilt
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: color,
        transform: t ? `rotate(${t}deg)` : undefined,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
