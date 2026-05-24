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

// themes where --bg is light — overlay active accent needs override to stay readable on dark overlay
const LIGHT_THEMES = new Set(['minimal'])

export default function Nav({ theme }: { theme: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // overlay active accent: minimal theme's accent is dark (#1a1a1a) — unreadable on dark overlay
  const overlayActiveColor = LIGHT_THEMES.has(theme) ? '#f5f5f0' : 'var(--accent)'

  return (
    <>
      <nav
        data-theme={theme}
        style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'color-mix(in srgb, var(--bg) 88%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-sm tracking-widest transition-opacity hover:opacity-70"
            style={{ color: 'var(--fg)' }}
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
                    className="text-sm transition-all"
                    style={{
                      color: active ? 'var(--accent)' : 'var(--muted)',
                      opacity: active ? 1 : 0.8,
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
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: 'var(--fg)',
                top: '50%',
                transform: open ? 'translateY(-0.5px) rotate(45deg)' : 'translateY(-6px)',
              }}
            />
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: 'var(--fg)',
                top: '50%',
                transform: 'translateY(-0.5px)',
                opacity: open ? 0 : 1,
              }}
            />
            <span
              className="absolute left-0 w-full h-px transition-all duration-300"
              style={{
                background: 'var(--fg)',
                top: '50%',
                transform: open ? 'translateY(-0.5px) rotate(-45deg)' : 'translateY(6px)',
              }}
            />
          </button>
        </div>
      </nav>

      {/* fullscreen overlay — dark bg, page theme accent for active link */}
      <div
        data-theme={theme}
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
                    color: active ? overlayActiveColor : '#f5f5f0',
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
