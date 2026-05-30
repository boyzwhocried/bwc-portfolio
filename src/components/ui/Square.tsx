// the brand atom: a flat vermilion square. used as bullet ticks, section marks,
// the nav lockup, loading dots, and the drifting ambient layer.
export default function Square({
  size = 10,
  color = 'var(--vermilion)',
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
