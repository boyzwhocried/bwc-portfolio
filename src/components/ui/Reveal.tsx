'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// Reveal-once-on-scroll wrapper for content blocks (calm fade + small rise).
// Reduced-motion shows children instantly. Use on detail-page content that the
// reveal-layer pass did not reach (case study, blog post). amount stays low so
// above-the-fold blocks reveal on load and nothing gets stuck hidden.
export default function Reveal({
  children,
  delay = 0,
  y = 16,
  amount = 0.15,
  className,
  style,
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  amount?: number
  className?: string
  style?: React.CSSProperties
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: dur.base, ease: ease.out, delay }}
    >
      {children}
    </motion.div>
  )
}
