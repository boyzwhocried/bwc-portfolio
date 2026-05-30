'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Square from '@/components/ui/Square'

const links = [
  { href: '/', label: 'home' },
  { href: '/about', label: 'about' },
  { href: '/projects', label: 'projects' },
  { href: '/blog', label: 'blog' },
  { href: '/contact', label: 'contact' },
]

export default function Nav({ room }: { room: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // close the mobile menu on route change (deferred so it is not a sync set in the effect body)
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // /hub replaces the nav with its own OS menu bar (rendered by the hub page)
  if (room === 'hub') return null

  return (
    <>
      <nav
        data-room={room}
        style={{
          borderBottom: '1px solid var(--rule)',
          backgroundColor: 'var(--bg)',
        }}
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      >
        <div
          className="h-14 flex items-center justify-between"
          style={{ maxWidth: 'var(--page-max)', marginInline: 'auto', paddingInline: 'var(--page-px)' }}
        >
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm tracking-widest transition-opacity hover:opacity-70"
            style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
            aria-label="bwc home"
          >
            <Square size={11} className="transition-transform group-hover:rotate-45" />
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

          {/* hamburger, mobile only */}
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

      {/* fullscreen overlay, follows page theme */}
      <div
        data-room={room}
        className="md:hidden fixed inset-0 z-40 flex flex-col justify-center px-8 transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg)',
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
                    color: active ? 'var(--accent)' : 'var(--fg)',
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
          style={{ color: 'var(--muted)', opacity: open ? 1 : 0, transitionDelay: '0.35s' }}
        >
          boyzwhocried
        </p>
      </div>
    </>
  )
}
