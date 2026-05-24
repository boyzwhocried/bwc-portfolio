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

function isLightPage(pathname: string) {
  return LIGHT_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default function Nav() {
  const pathname = usePathname()
  const light = isLightPage(pathname)

  const navBg = light ? 'rgba(250,250,248,0.85)' : 'rgba(10,10,10,0.75)'
  const borderColor = light ? '#e0e0e0' : '#2a2a2a'
  const logoColor = light ? '#1a1a1a' : '#f5f5f0'
  const activeColor = light ? '#1a1a1a' : '#ffffff'
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
          className="font-mono text-sm tracking-widest"
          style={{ color: logoColor }}
        >
          bwc
        </Link>
        <ul className="flex gap-6">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="text-sm transition-opacity hover:opacity-100"
                  style={{
                    color: active ? activeColor : mutedColor,
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
