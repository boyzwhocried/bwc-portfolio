import { useReducedMotion } from 'framer-motion'

/** Drift-in-on-load variant (type rises + fades). Use useDriftIn() for reduced-motion safety. */
export const driftIn = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

/** Returns drift-in variants that collapse to instant when the user prefers reduced motion. */
export function useDriftIn() {
  const reduce = useReducedMotion()
  if (reduce) {
    return {
      hidden: { opacity: 1, y: 0 },
      show: () => ({ opacity: 1, y: 0, transition: { duration: 0 } }),
    }
  }
  return driftIn
}
