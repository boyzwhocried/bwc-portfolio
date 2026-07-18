'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Square from '@/components/ui/Square'
import useRandomTilt from '@/lib/useRandomTilt'

const primaryLinks = [
  { href: '/', label: 'home' },
  { href: '/projects', label: 'work', paths: ['/projects', '/cv'] },
  { href: '/now', label: 'now', paths: ['/now', '/blog'] },
  { href: '/contact', label: 'contact' },
]

const roomLinks = [
  { href: '/about', label: 'about' },
  { href: '/music', label: 'music' },
  { href: '/photography', label: 'photography' },
  { href: '/hub', label: 'hub' },
  { href: '/sandbox', label: 'sandbox' },
]

function isActive(pathname: string, href: string, paths?: string[]) {
  return (paths ?? [href]).some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/'))
}

export default function Nav({ room }: { room: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [roomsOpen, setRoomsOpen] = useState(false)
  // random base lean on the brand mark; the inner Square keeps its hover rotate
  const navTilt = useRandomTilt()

  // close the mobile menu on route change (deferred so it is not a sync set in the effect body)
  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(false)
      setRoomsOpen(false)
    }, 0)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setRoomsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

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
          style={{ maxWidth: 'var(--page-max)', marginLeft: 'auto', marginRight: 'auto', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)' }}
        >
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm tracking-widest transition-opacity hover:opacity-70"
            style={{ color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
            aria-label="bwc home"
          >
            <span
              id="nav-square"
              style={{
                display: 'inline-flex',
                transform: navTilt ? `rotate(${navTilt}deg)` : undefined,
                transformOrigin: 'center',
              }}
            >
              <Square size={11} className="transition-transform group-hover:rotate-45" />
            </span>
            bwc
          </Link>

          {/* desktop links */}
          <ul className="hidden md:flex items-center gap-6">
            {primaryLinks.slice(0, 3).map(({ href, label, paths }) => {
              const active = isActive(pathname, href, paths)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm transition-all"
                    style={{
                      color: active ? 'var(--accent-text)' : 'var(--muted)',
                    }}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
            <li className="relative">
              <button
                type="button"
                aria-expanded={roomsOpen}
                aria-controls="room-index"
                onClick={() => setRoomsOpen((value) => !value)}
                className="text-sm transition-opacity hover:opacity-60"
                style={{ color: roomLinks.some(({ href }) => isActive(pathname, href)) ? 'var(--accent-text)' : 'var(--muted)', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              >
                rooms
              </button>
              <div
                id="room-index"
                className="absolute right-0 top-8 w-44 transition-all duration-200"
                style={{ background: 'var(--bg)', border: '1px solid var(--rule)', boxShadow: '4px 4px 0 var(--fg)', opacity: roomsOpen ? 1 : 0, pointerEvents: roomsOpen ? 'auto' : 'none', transform: roomsOpen ? 'translateY(0)' : 'translateY(-6px)', padding: '0.75rem' }}
              >
                <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '0.5rem' }}>other rooms</p>
                <div className="flex flex-col gap-1">
                  {roomLinks.map(({ href, label }) => (
                    <Link key={href} href={href} onClick={() => setRoomsOpen(false)} className="px-2 py-1.5 transition-colors hover:bg-[var(--rule)]" style={{ color: isActive(pathname, href) ? 'var(--accent-text)' : 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
            {primaryLinks.slice(3).map(({ href, label, paths }) => {
              const active = isActive(pathname, href, paths)
              return (
                <li key={href}>
                  <Link href={href} className="text-sm transition-all" style={{ color: active ? 'var(--accent-text)' : 'var(--muted)' }}>
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
          {primaryLinks.map(({ href, label, paths }, i) => {
            const active = isActive(pathname, href, paths)
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
          <li style={{ paddingTop: '1.5rem' }}>
            <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>rooms</p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2">
              {roomLinks.map(({ href, label }) => (
                <Link key={href} href={href} className="text-base transition-opacity hover:opacity-60" tabIndex={open ? 0 : -1} style={{ color: isActive(pathname, href) ? 'var(--accent)' : 'var(--fg)' }}>
                  {label}
                </Link>
              ))}
            </div>
          </li>
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
