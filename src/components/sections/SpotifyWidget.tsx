'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SpotifyTrack } from '@/types'

const POLL_PLAYING = 30_000
const POLL_IDLE = 120_000

export default function SpotifyWidget() {
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function scheduleNext(isPlaying: boolean) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchTrack, isPlaying ? POLL_PLAYING : POLL_IDLE)
  }

  async function fetchTrack() {
    if (document.hidden) return
    try {
      const res = await fetch('/api/spotify/now-playing')
      if (res.status === 429) return
      const data: SpotifyTrack | null = await res.json()
      setTrack(data)
      scheduleNext(!!data?.is_playing)
    } catch {
      setTrack(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrack()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const playing = !!track?.is_playing
  const label = loading
    ? 'connecting...'
    : playing
    ? `now playing, ${track!.title} · ${track!.artist}`
    : 'the listening room'

  // Footer one-liner funnels into the /music room (internal), NOT the Spotify track.
  return (
    <>
      <style>{`
        @keyframes swPulse { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .sw-bar { width: 2px; height: 11px; margin: 0 1px; background: currentColor; transform-origin: bottom; display: inline-block; opacity: 0.5; }
        .sw-bar.sw-on { opacity: 1; animation: swPulse 0.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sw-bar.sw-on { animation: none; } }
      `}</style>
      <Link href="/music" className="inline-flex max-w-full transition-opacity hover:opacity-70" style={{ fontFamily: 'var(--font-mono)' }}>
        <span className="inline-flex items-center gap-2 min-w-0" style={{ color: 'var(--muted)' }}>
          <span className="flex items-end h-3 flex-shrink-0" aria-hidden>
            <span className={`sw-bar ${playing ? 'sw-on' : ''}`} />
            <span className={`sw-bar ${playing ? 'sw-on' : ''}`} style={{ animationDelay: '0.2s' }} />
            <span className={`sw-bar ${playing ? 'sw-on' : ''}`} style={{ animationDelay: '0.4s' }} />
          </span>
          <span className="truncate" style={{ color: playing ? 'var(--fg)' : 'var(--muted)', lineHeight: 1.5, paddingBottom: 1 }}>
            {label} →
          </span>
        </span>
      </Link>
    </>
  )
}
