'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

type AppStatus = 'live' | 'building' | 'locked'

interface HubApp {
  id: string
  name: string
  file: string
  blurb: string
  status: AppStatus
  href?: string // external (↗) or internal (→); absent for locked/building
  external?: boolean
  // desktop placement (draggable from here)
  x: string
  y: number
  w: number
}

// NOTE: Personal OS + Undangin have no public app URL, so they launch to their
// case study. Outreach OS + Vault of Frights launch externally. FinOS is locked.
const APPS: HubApp[] = [
  { id: 'pos', name: 'Personal OS', file: 'personal-os.app', blurb: 'the wiki + bot that runs my life', status: 'live', href: '/projects/personal-os', x: '4%', y: 24, w: 300 },
  { id: 'vof', name: 'Vault of Frights', file: 'vault-of-frights.app', blurb: 'auto horror-shorts channel', status: 'live', href: 'https://www.youtube.com/@VaultFrights', external: true, x: '40%', y: 96, w: 300 },
  { id: 'oos', name: 'Outreach OS', file: 'outreach-os.app', blurb: 'freelance outreach · private tooling', status: 'locked', x: '10%', y: 220, w: 290 },
  { id: 'und', name: 'Undangin', file: 'undangin.app', blurb: 'b2b wedding e-invites', status: 'live', href: '/projects/undangin', x: '46%', y: 286, w: 280 },
  { id: 'gwf', name: 'Greywater Falls', file: 'greywater-falls.app', blurb: 'a town that writes its own daily paper', status: 'live', href: 'https://greywater-falls.vercel.app', external: true, x: '52%', y: 386, w: 300 },
  { id: 'fin', name: 'FinOS', file: 'finos.app', blurb: 'finance · auth required', status: 'locked', href: 'https://finance-dashboard-five-ashen.vercel.app', external: true, x: '14%', y: 410, w: 290 },
  { id: 'next', name: 'next thing', file: 'building...', blurb: 'always growing', status: 'building', x: '36%', y: 500, w: 250 },
]

function Clock() {
  const [time, setTime] = useState<string>('')
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
      }).format(new Date())
    // deferred initial set + interval (avoids a sync setState in the effect body)
    const t0 = setTimeout(() => setTime(fmt()), 0)
    const t = setInterval(() => setTime(fmt()), 30_000)
    return () => { clearTimeout(t0); clearInterval(t) }
  }, [])
  return <span suppressHydrationWarning>{time || '--:--'} · jakarta</span>
}

function WindowChrome({ app }: { app: HubApp }) {
  const locked = app.status === 'locked'
  const building = app.status === 'building'

  const statusLabel =
    locked ? '🔒 locked' : building ? '◐ building' : '● live'
  const action =
    locked ? (app.href ? 'sign in to access →' : 'owner only') : building ? 'soon' : app.external ? 'open ↗' : 'open →'

  const titleBar = (
    <div
      style={{
        background: locked ? 'var(--vermilion)' : 'var(--ink)',
        color: locked ? 'var(--ink)' : 'var(--paper)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        padding: '4px 8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        cursor: 'grab',
      }}
    >
      <span>{app.file}</span>
      <span>{locked || building ? statusLabel : `${statusLabel}  □ ✕`}</span>
    </div>
  )

  // only the action line is a link; the rest of the window is the drag surface.
  // stopPropagation on pointer-down so clicking the link does not start a drag.
  const actionStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: building ? '#6d5212' : 'var(--accent-text)',
    marginTop: 10,
    display: 'inline-block',
  }
  const actionEl = !app.href ? (
    <span style={actionStyle}>{action}</span>
  ) : app.external ? (
    <a href={app.href} target="_blank" rel="noopener noreferrer" draggable={false}
       onPointerDownCapture={(e) => e.stopPropagation()}
       className="transition-opacity hover:opacity-60" style={actionStyle}>
      {action}
    </a>
  ) : (
    <Link href={app.href} draggable={false}
       onPointerDownCapture={(e) => e.stopPropagation()}
       className="transition-opacity hover:opacity-60" style={actionStyle}>
      {action}
    </Link>
  )

  const windowStyle: React.CSSProperties = {
    width: '100%',
    background: locked ? '#efe2dc' : '#f1ede4',
    border: locked ? '1px dashed var(--vermilion)' : '1px solid var(--ink)',
    boxShadow: locked ? '4px 4px 0 var(--vermilion)' : '4px 4px 0 var(--ink)',
    userSelect: 'none',
  }

  return (
    <div style={windowStyle} aria-label={`${app.name}, ${app.status}`}>
      {titleBar}
      <div style={{ padding: 12 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: locked ? '#5a4a44' : 'var(--fg)' }}>
          {app.name}
        </div>
        <div style={{ fontSize: 11, color: locked ? '#6e5d56' : 'var(--muted)', marginTop: 4 }}>{app.blurb}</div>
        {actionEl}
      </div>
    </div>
  )
}

export default function HubDesktop() {
  const deskRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* menu bar replaces the nav (the entry gesture) */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 30,
          background: 'var(--ink)',
          color: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}
      >
        <Link href="/" style={{ color: 'var(--vermilion)' }}>◆ bwc.os</Link>
        <span style={{ opacity: 0.8 }}>file</span>
        <span style={{ opacity: 0.8 }}>apps</span>
        <Link href="/about" style={{ color: 'var(--paper)', opacity: 0.8 }}>about</Link>
        <span style={{ marginLeft: 'auto', opacity: 0.85 }}>
          <Clock />
        </span>
      </div>

      {/* desktop surface */}
      <div ref={deskRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 760 }}>
        <p
          className="px-5"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', paddingTop: 12 }}
        >
          <span className="hidden md:inline">drag the windows around (grab a title bar). </span>
          <span className="md:hidden">tap a window to open. </span>
          🔒 = private, sign-in required.
        </p>

        {/* mobile: stacked windows (no absolute positioning) */}
        <div className="md:hidden flex flex-col gap-5 px-5" style={{ paddingTop: 16, paddingBottom: 40 }}>
          {APPS.map((app) => (
            <div key={app.id} style={{ maxWidth: 360 }}>
              <WindowChrome app={app} />
            </div>
          ))}
        </div>

        {/* desktop: absolutely-positioned draggable windows */}
        <div className="hidden md:block">
          {APPS.map((app, i) => (
            <motion.div
              key={app.id}
              drag
              dragMomentum={false}
              dragElastic={0.06}
              dragConstraints={deskRef}
              whileDrag={{ scale: 1.02, zIndex: 40, cursor: 'grabbing' }}
              style={{ position: 'absolute', left: app.x, top: app.y, width: app.w }}
              initial={reduce ? false : { opacity: 0, y: -24, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: dur.base, ease: ease.out, delay: reduce ? 0 : i * 0.08 }}
            >
              <WindowChrome app={app} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
