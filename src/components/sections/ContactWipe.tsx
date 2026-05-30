'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

export default function ContactWipe() {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(false)
  useEffect(() => { if (reduce) setDone(true) }, [reduce])
  if (done) return null
  return (
    <motion.div
      aria-hidden
      initial={{ clipPath: 'inset(0 0 0 0)' }}
      animate={{ clipPath: 'inset(0 0 0 100%)' }}
      transition={{ duration: dur.slow, ease: ease.inOut }}
      onAnimationComplete={() => setDone(true)}
      style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'var(--ink)', pointerEvents: 'none' }}
    />
  )
}
