import { useEffect, useLayoutEffect, useState } from 'react'

// useLayoutEffect on the client (applies the tilt before paint, so the neutral
// 0deg frame is never visible), useEffect on the server to dodge the SSR warning.
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// a fresh random tilt on every page load. returns 0 on SSR and on the first
// client render so the server HTML matches the first client render (no hydration
// mismatch), then sets a random tilt: magnitude in [min, max] degrees, random
// direction (left or right). re-randomized each refresh because Math.random runs
// once per mount and is never persisted.
export default function useRandomTilt(min = 3, max = 7): number {
  const [tilt, setTilt] = useState(0)
  useIso(() => {
    const mag = min + Math.random() * (max - min)
    const sign = Math.random() < 0.5 ? -1 : 1
    setTilt(Number((sign * mag).toFixed(2)))
  }, [min, max])
  return tilt
}
