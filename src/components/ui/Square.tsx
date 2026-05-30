// the brand atom: a flat square that follows the room accent. used as bullet
// ticks, section marks, the nav lockup, loading dots, and the drifting ambient
// layer. defaults to --accent so it stays visible in rooms that suppress
// vermilion (e.g. contact's vermilion flood, projects' monochrome); pass an
// explicit color to override.
export default function Square({
  size = 10,
  color = 'var(--accent)',
  tilt = 0,
  className,
  style,
}: {
  size?: number
  color?: string
  tilt?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        background: color,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        flexShrink: 0,
        ...style,
      }}
    />
  )
}
