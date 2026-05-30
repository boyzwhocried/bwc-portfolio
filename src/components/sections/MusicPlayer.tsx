'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SpotifyTrack } from '@/types'

const POLL_PLAYING = 30_000
const POLL_IDLE = 120_000
const BARS = [10, 22, 14, 24, 8, 18, 12, 20, 15] // base heights for the hero equalizer

export default function MusicPlayer() {
  const reduce = useReducedMotion()
  const [track, setTrack] = useState<SpotifyTrack | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function fetchTrack() {
      if (document.hidden) return
      try {
        const res = await fetch('/api/spotify/now-playing')
        if (res.status === 429) return
        const data: SpotifyTrack | null = await res.json()
        setTrack(data)
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(fetchTrack, data?.is_playing ? POLL_PLAYING : POLL_IDLE)
      } catch {
        setTrack(null)
      } finally {
        setLoading(false)
      }
    }
    fetchTrack()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const playing = !!track?.is_playing
  const hasArt = !!track?.album_art_url

  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <style>{`
        @keyframes eqBar { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        .eq-bar { width: 5px; background: var(--accent); transform-origin: bottom; border-radius: 1px; }
        .eq-bar.animate { animation: eqBar 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .eq-bar.animate { animation: none; } }
      `}</style>

      <div
        className="mx-auto px-6 flex flex-col md:flex-row md:items-center gap-10 md:gap-14"
        style={{ maxWidth: '60rem', paddingTop: '5rem', paddingBottom: '4rem' }}
      >
        {/* big album art (the hero), with glow */}
        <div
          className="flex-shrink-0"
          style={{
            width: 'clamp(13rem, 38vw, 19rem)',
            aspectRatio: '1 / 1',
            background: hasArt ? 'transparent' : 'linear-gradient(135deg, #e84c28, #7a2a4a)',
            boxShadow: playing ? '0 0 60px rgba(232,76,40,0.35)' : '0 0 40px rgba(232,76,40,0.15)',
            position: 'relative',
          }}
        >
          {hasArt && (
            // external Spotify CDN art; plain img avoids next/image domain config
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={track!.album_art_url}
              alt={`album art: ${track!.album}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

        {/* track info */}
        <div className="min-w-0">
          <div
            className="uppercase"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}
          >
            {loading ? 'connecting to spotify...' : playing ? '● now playing · spotify live' : '○ not playing right now'}
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2.2rem, 7vw, 4rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              marginTop: '0.75rem',
            }}
          >
            {track?.title ?? 'silence'}
          </h1>

          <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: '0.5rem' }}>
            {track ? `${track.artist}${track.album ? ` · ${track.album}` : ''}` : 'nothing on the speakers at the moment'}
          </p>

          {/* big live equalizer */}
          <div className="flex items-end gap-1.5" style={{ height: 32, marginTop: '1.75rem' }} aria-hidden>
            {BARS.map((h, i) => (
              <span
                key={i}
                className={`eq-bar${playing ? ' animate' : ''}`}
                style={{
                  height: h,
                  animationDelay: `${i * 0.12}s`,
                  opacity: playing ? 1 : 0.4,
                }}
              />
            ))}
          </div>

          {/* the curation system / playlist */}
          <div style={{ marginTop: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {track?.track_url && (
              <a href={track.track_url} target="_blank" rel="noopener noreferrer"
                 className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
                open in spotify ↗
              </a>
            )}
            <a href="https://open.spotify.com/user/boyzwhocried" target="_blank" rel="noopener noreferrer"
               className="transition-opacity hover:opacity-70" style={{ color: 'var(--muted)' }}>
              &apos;of insta&apos; · my curation system ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
