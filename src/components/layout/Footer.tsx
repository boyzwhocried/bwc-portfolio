import Link from 'next/link'
import SpotifyWidget from '@/components/sections/SpotifyWidget'

// every room reachable from the footer (nav only carries the primary 5)
const SITEMAP = [
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/hub', label: 'hub' },
  { href: '/music', label: 'music' },
  { href: '/photography', label: 'photography' },
  { href: '/sandbox', label: 'sandbox' },
  { href: '/cv', label: 'cv' },
  { href: '/now', label: 'now' },
  { href: '/contact', label: 'contact' },
]

export default function Footer({ room }: { room: string }) {
  return (
    <footer
      data-room={room}
      style={{ borderTop: '1px solid var(--rule)', color: 'var(--muted)', backgroundColor: 'var(--bg)' }}
      className="mt-32 py-8"
    >
      <div className="max-w-5xl mx-auto px-6" style={{ fontFamily: 'var(--font-mono)' }}>
        {/* sitemap row */}
        <nav className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: 11, paddingBottom: '1.5rem' }} aria-label="all pages">
          {SITEMAP.map(({ href, label }) => (
            <Link key={href} href={href} className="transition-opacity hover:opacity-100" style={{ color: 'var(--muted)', opacity: 0.75 }}>
              {label}
            </Link>
          ))}
        </nav>

        {/* signature row: live now-playing + year */}
        <div className="flex items-center justify-between gap-6 text-xs" style={{ borderTop: '1px solid var(--rule)', paddingTop: '1.25rem' }}>
          <span className="min-w-0 flex-1">
            <SpotifyWidget />
          </span>
          <span className="flex-shrink-0">{new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  )
}
