interface MarqueeProps {
  items: string[]
  speed?: number
}

export default function Marquee({ items, speed = 30 }: MarqueeProps) {
  const repeated = [...items, ...items]
  return (
    <>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee ${speed}s linear infinite;
          display: flex;
          width: max-content;
        }
      `}</style>
      <div
        style={{
          overflow: 'hidden',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 0',
        }}
        aria-hidden
      >
        <div className="marquee-track">
          {repeated.map((item, i) => (
            <span key={i} className="flex items-center whitespace-nowrap">
              <span
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: 'var(--muted)', padding: '0 1.5rem' }}
              >
                {item}
              </span>
              <span
                className="font-mono text-xs"
                style={{ color: 'var(--border)' }}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
