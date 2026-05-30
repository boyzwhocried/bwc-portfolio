'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

export default function PortfolioTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: ease.out }}
    >
      {children}
    </motion.div>
  )
}
