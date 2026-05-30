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

/** Scroll-reveal fade-up. Use with whileInView. Reduced-motion-safe via the hook. */
export function useFadeUp() {
  const reduce = useReducedMotion()
  if (reduce) {
    return { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0, transition: { duration: 0 } } }
  }
  return {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  }
}

/** Parent that staggers its children (pair child elements with useFadeUp/driftIn). */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

/** Shared hover lift for cards/rows. Spread onto a motion element's whileHover. */
export const hoverLift = { y: -3, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } }
