import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import Square from '@/components/ui/Square'

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

const ROOMS = [
  { href: '/', label: 'home' },
  { href: '/projects', label: 'projects' },
  { href: '/about', label: 'about' },
  { href: '/contact', label: 'contact' },
]

export default function NotFound() {
  return (
    <div data-room="home">
      <Nav room="home" />
      <main>
        <section
          style={{
            ...frame,
            minHeight: 'calc(100vh - 18rem)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingTop: '4rem',
            paddingBottom: '4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Square size={14} />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent-text)' }}>
              error // 404
            </p>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(3rem, 12vw, 9rem)', lineHeight: 0.9, letterSpacing: '-0.03em', marginBottom: '1.5rem', color: 'var(--fg)' }}>
            cried wolf.
          </h1>

          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', lineHeight: 1.5, maxWidth: '34ch', marginBottom: '3rem', color: 'var(--fg)' }}>
            you called for a page. nobody came, because this one was never here. try a door that opens.
          </p>

          <nav aria-label="go somewhere that exists" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            {ROOMS.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="footer-link"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', letterSpacing: '0.04em' }}
              >
                {r.label} &rarr;
              </Link>
            ))}
          </nav>
        </section>
      </main>
      <Footer room="home" />
    </div>
  )
}
