'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// Shared overlay shell for the newer sandbox toys. Each toy themes its own panel
// (letterpress paper, observatory black, 8-bit cabinet) via the chrome props, so
// the toys stay visually distinct while sharing the open/close/ESC plumbing.
//
// Rendered through a portal to document.body so it escapes whatever page stacking
// context it was invoked from (e.g. a section with its own z-index) and always
// paints above the fixed site nav (z-50). Background scroll is locked while open,
// and the panel is sized in dvh + padded to clear the nav, so on mobile the close
// button never hides under the navbar and the page footer never bleeds over it.
export default function SandboxModal({
  title,
  onClose,
  children,
  width = 520,
  panelBg = '#f1ede4',
  panelFg = '#1a1a1a',
  borderColor = '#1a1a1a',
  titleFont = 'var(--font-display)',
  titleRight,
  fullscreen = false,
}: {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  width?: number
  panelBg?: string
  panelFg?: string
  borderColor?: string
  titleFont?: string
  titleRight?: React.ReactNode
  fullscreen?: boolean
}) {
  const reduce = useReducedMotion()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // lock background scroll so the page (and its footer) cannot scroll behind the
  // open modal on touch devices
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <motion.div
      role="dialog"
      aria-label={typeof title === 'string' ? title : 'sandbox toy'}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.quick, ease: ease.out }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(10,10,12,0.62)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // top pad clears the fixed 3.5rem nav; overflow guards very short screens
        padding: fullscreen ? 0 : '4.5rem 1rem 1.5rem',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { y: fullscreen ? 0 : 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: dur.quick, ease: ease.out }}
        style={{
          width: fullscreen ? '100vw' : `min(94vw, ${width}px)`,
          height: fullscreen ? '100dvh' : undefined,
          // dvh (not vh) so the mobile address bar does not push the panel taller
          // than the visible viewport; 6rem accounts for the overlay padding
          maxHeight: fullscreen ? '100dvh' : 'calc(100dvh - 6rem)',
          display: 'flex',
          flexDirection: 'column',
          background: panelBg,
          color: panelFg,
          border: fullscreen ? 'none' : `1.5px solid ${borderColor}`,
          boxShadow: fullscreen ? 'none' : `7px 7px 0 ${borderColor}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 14px', gap: 12, flexShrink: 0 }}
        >
          <span style={{ fontFamily: titleFont, fontWeight: 700, fontSize: 15, letterSpacing: '0.01em' }}>
            {title}
          </span>
          <div className="flex items-center" style={{ gap: 12 }}>
            {titleRight}
            <button
              onClick={onClose}
              aria-label="close"
              style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflow: fullscreen ? 'hidden' : 'auto', flex: fullscreen ? 1 : undefined, minHeight: 0 }}>{children}</div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
