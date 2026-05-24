'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const links = [
  { href: '/', label: 'home' },
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/contact', label: 'contact' },
]

const LIGHT_PAGES = ['/blog']

const PAGE_ACCENTS: { prefix: string; accent: string }[] = [
  { prefix: '/about',    accent: '#8a9e8a' },
  { prefix: '/projects', accent: '#c8b560' },
  { prefix: '/contact',  accent: '#c87840' },
  { prefix: '/blog',     accent: '#1a1a1a' },
  { prefix: '/',         accent: '#ffffff' },
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
  const [open, setOpen] = useState(false)

  // close overlay on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const light = isLightPage(pathname)
  const activeAccent = getPageAccent(pathname)

  const navBg = light ? 'rgba(250,250,248,0.88)' : 'rgba(10,10,10,0.78)'
  const borderColor = light ? '#e0e0e0' : '#2a2a2a'
  const logoColor = light ? '#1a1a1a' : '#f5f5f0'
  const mutedColor = light ? '#8a8a8a' : '#6b6b6b'
  const hamburgerColor = light ? '#1a1a1a' : '#f5f5f0'

  return (
    <>
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

          {/* desktop links */}
          <ul className="hidden md:flex gap-6">
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

          {/* hamburger — mobile only */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'close menu' : 'open menu'}
            className="md:hidden relative w-6 h-6 transition-opacity hover:opacity-70"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {/* top bar — moves to center, rotates 45deg */}
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: hamburgerColor,
                top: '50%',
                transform: open ? 'translateY(-0.5px) rotate(45deg)' : 'translateY(-6px)',
              }}
            />
            {/* middle bar — fades out */}
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: hamburgerColor,
                top: '50%',
                transform: 'translateY(-0.5px)',
                opacity: open ? 0 : 1,
              }}
            />
            {/* bottom bar — moves to center, rotates -45deg */}
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: hamburgerColor,
                top: '50%',
                transform: open ? 'translateY(-0.5px) rotate(-45deg)' : 'translateY(6px)',
              }}
            />
          </button>
        </div>
      </nav>

      {/* fullscreen overlay — mobile only */}
      <div
        className="md:hidden fixed inset-0 z-40 flex flex-col justify-center px-8 transition-all duration-300"
        style={{
          background: 'rgba(8,8,8,0.97)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden={!open}
      >
        <ul className="space-y-2">
          {links.map(({ href, label }, i) => {
            const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
            return (
              <li
                key={href}
                style={{
                  transform: open ? 'translateY(0)' : 'translateY(16px)',
                  opacity: open ? 1 : 0,
                  transition: `transform 0.3s ease ${i * 0.06}s, opacity 0.3s ease ${i * 0.06}s`,
                }}
              >
                <Link
                  href={href}
                  className="block font-black tracking-tighter leading-none transition-opacity hover:opacity-60"
                  tabIndex={open ? 0 : -1}
                  style={{
                    fontSize: 'clamp(2.5rem, 12vw, 4rem)',
                    color: '#f5f5f0',
                    opacity: active ? 1 : 0.35,
                  }}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <p
          className="font-mono text-xs mt-16 transition-opacity duration-500"
          style={{ color: '#6b6b6b', opacity: open ? 1 : 0, transitionDelay: '0.35s' }}
        >
          boyzwhocried
        </p>
      </div>
    </>
  )
}
