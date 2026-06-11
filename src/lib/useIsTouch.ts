'use client'
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia('(pointer: coarse)')
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** True on coarse-pointer (touch) devices. SSR-safe (false on the server). */
export default function useIsTouch(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false,
  )
}
