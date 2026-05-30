import Link from 'next/link'
import Square from '@/components/ui/Square'
import SpotifyWidget from '@/components/sections/SpotifyWidget'

const ROOMS = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/hub', label: 'hub' },
  { href: '/now', label: 'now' },
  { href: '/music', label: 'music' },
  { href: '/photography', label: 'photography' },
  { href: '/sandbox', label: 'sandbox' },
  { href: '/cv', label: 'cv' },
  { href: '/contact', label: 'contact' },
]

const ELSEWHERE = [
  { href: 'https://github.com/boyzwhocried', label: 'github' },
  { href: 'https://linkedin.com/in/boyzwhocried', label: 'linkedin' },
  { href: 'mailto:verrel.alsyoumi@gmail.com', label: 'email' },
]

// shared padded inner frame
const inner: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

function ColHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', marginBottom: '1rem' }}>
      {children}
    </div>
  )
}

export default function Footer({ room }: { room: string }) {
  return (
    <footer
      data-room={room}
      style={{ borderTop: '1px solid var(--rule)', color: 'var(--muted)', backgroundColor: 'var(--bg)', marginTop: '6rem' }}
    >
      {/* columns */}
      <div style={{ ...inner, paddingTop: '3.5rem', paddingBottom: '3rem' }}>
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-10">
          {/* brand */}
          <div className="col-span-2 md:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-70" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
              <Square size={14} />
              boyzwhocried
            </Link>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: '0.75rem', maxWidth: '22rem' }}>
              i build things &amp; break a few. a playground and workshop that keeps growing.
            </p>
            <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', marginTop: '1rem' }}>
              est. 2024 · jakarta, id
            </p>
          </div>

          {/* rooms (two content-width sub-columns, sitting close as one block) */}
          <div className="md:col-span-5">
            <ColHead>rooms</ColHead>
            <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: '4.5rem', rowGap: '0.6rem', justifyContent: 'start' }}>
              {ROOMS.map(({ href, label }) => (
                <Link key={href} href={href} className="transition-opacity hover:opacity-100" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', opacity: 0.7 }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* elsewhere */}
          <div className="md:col-span-3">
            <ColHead>elsewhere</ColHead>
            <div className="flex flex-col gap-2">
              {ELSEWHERE.map(({ href, label }) => (
                <a key={label} href={href} target={href.startsWith('mailto') ? '_self' : '_blank'} rel="noopener noreferrer" className="transition-opacity hover:opacity-100" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', opacity: 0.7 }}>
                  {label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* baseline bar: full-width top border, equal top/bottom padding around the line */}
      <div style={{ borderTop: '1px solid var(--rule)' }}>
        <div
          className="flex items-center justify-between gap-6"
          style={{ ...inner, paddingTop: '1.25rem', paddingBottom: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1 }}
        >
          <span className="min-w-0 flex-1 flex items-center">
            <SpotifyWidget />
          </span>
          <span className="flex-shrink-0" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} bwc</span>
        </div>
      </div>
    </footer>
  )
}
