'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// Shared overlay shell for the newer sandbox toys. Each toy themes its own panel
// (letterpress paper, observatory black, 8-bit cabinet) via the chrome props, so
// the toys stay visually distinct while sharing the open/close/ESC plumbing.
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
}) {
  const reduce = useReducedMotion()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
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
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: dur.quick, ease: ease.out }}
        style={{
          width: `min(94vw, ${width}px)`,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: panelBg,
          color: panelFg,
          border: `1.5px solid ${borderColor}`,
          boxShadow: `7px 7px 0 ${borderColor}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{ borderBottom: `1px solid ${borderColor}`, padding: '8px 14px', gap: 12 }}
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
        <div style={{ overflow: 'auto' }}>{children}</div>
      </motion.div>
    </motion.div>
  )
}
