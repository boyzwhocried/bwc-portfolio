'use client'

import { motion } from 'framer-motion'
import { useDriftIn } from '@/lib/motion'

export default function NowHeadline({ children }: { children: React.ReactNode }) {
  const drift = useDriftIn()
  return (
    <motion.h1
      variants={drift}
      initial="hidden"
      animate="show"
      style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontWeight: 700,
        fontSize: 'clamp(2.2rem, 6vw, 4rem)',
        lineHeight: 1.05,
        color: 'var(--fg)',
        marginTop: '1.5rem',
        maxWidth: '20ch',
      }}
    >
      {children}
    </motion.h1>
  )
}
