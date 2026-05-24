'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'home' },
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/contact', label: 'contact' },
]

const LIGHT_PAGES = ['/blog']

// accent color per page section, matches each data-theme
const PAGE_ACCENTS: { prefix: string; accent: string }[] = [
  { prefix: '/about',      accent: '#8a9e8a' },  // genx sage
  { prefix: '/projects',  accent: '#c8b560' },  // mono amber
  { prefix: '/contact',   accent: '#c87840' },  // grunge orange
  { prefix: '/blog',      accent: '#1a1a1a' },  // minimal ink
  { prefix: '/',          accent: '#ffffff' },  // swiss white (fallback last)
]

function getPageAccent(pathname: string): string {
  for (const { prefix, accent } of PAGE_ACCENTS) {
    if (prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')) {
      return accent
    }
  }
  return '#ffffff'
}

function isLightPage(pathname: string) {
  return LIGHT_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function Nav() {
  const pathname = usePathname()
  const light = isLightPage(pathname)
  const activeAccent = getPageAccent(pathname)

  const navBg = light ? 'rgba(250,250,248,0.88)' : 'rgba(10,10,10,0.78)'
  const borderColor = light ? '#e0e0e0' : '#2a2a2a'
  const logoColor = light ? '#1a1a1a' : '#f5f5f0'
  const mutedColor = light ? '#8a8a8a' : '#6b6b6b'

  return (
    <nav
      style={{
        borderBottom: `1px solid ${borderColor}`,
        backgroundColor: navBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-sm tracking-widest transition-opacity hover:opacity-70"
          style={{ color: logoColor }}
        >
          bwc
        </Link>
        <ul className="flex gap-6">
          {links.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm transition-all hover:opacity-100"
                  style={{
                    color: active ? activeAccent : mutedColor,
                    opacity: active ? 1 : 0.7,
                  }}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
