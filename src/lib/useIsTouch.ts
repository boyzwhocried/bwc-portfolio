'use client'
import { useEffect, useState } from 'react'

/** True on coarse-pointer (touch) devices. SSR-safe (defaults false until mounted). */
export default function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    setTouch(mq.matches)
    const on = () => setTouch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return touch
}
