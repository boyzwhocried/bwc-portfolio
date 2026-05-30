'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SpotifyTrack } from '@/types'
import DriftingSquares from '@/components/ui/DriftingSquares'

const POLL_PLAYING = 30_000
const POLL_IDLE = 120_000
const BARS = [10, 22, 14, 24, 8, 18, 12, 20, 15]

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

// curated, hand-maintained (edit anytime). the API-pulled version (recently-played /
// top-artists) needs extra Spotify scopes + re-auth; deferred.
const ROTATION = [
  { artist: 'Olivia Rodrigo', track: 'drop dead' },
  { artist: 'Yot Club', track: 'YKWIM?' },
  { artist: 'Maisie Peters', track: 'Run Your Mouth' },
  { artist: 'boy pablo', track: 'Feeling Lonely' },
  { artist: 'Honey Revenge', track: 'Distracted' },
  { artist: 'aphex twin', track: 'Xtal' },
]

export default function MusicPlayer() {
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
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      <DriftingSquares variant="music" color="var(--paper)" opacity={0.05} count={6} />
      <style>{`
        @keyframes eqBar { 0%,100% { transform: scaleY(0.25); } 50% { transform: scaleY(1); } }
        .eq-bar { width: 5px; background: var(--accent); transform-origin: bottom; border-radius: 1px; }
        .eq-bar.animate { animation: eqBar 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .eq-bar.animate { animation: none; } }
      `}</style>

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3rem', paddingBottom: '3rem' }}>
        {/* now-playing hero */}
        <div className="flex flex-col md:flex-row md:items-center gap-10 md:gap-14">
          <div className="flex-shrink-0" style={{ width: 'clamp(13rem, 32vw, 18rem)', aspectRatio: '1 / 1', background: hasArt ? 'transparent' : 'linear-gradient(135deg, #e84c28, #7a2a4a)', boxShadow: playing ? '0 0 60px rgba(232,76,40,0.35)' : '0 0 40px rgba(232,76,40,0.15)', position: 'relative' }}>
            {hasArt && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track!.album_art_url} alt={`album art: ${track!.album}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>

          <div className="min-w-0">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.12em' }}>
              {loading ? 'connecting to spotify...' : playing ? '● now playing · spotify live' : '○ not playing right now'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2.2rem, 7vw, 4rem)', lineHeight: 0.95, letterSpacing: '-0.02em', color: 'var(--fg)', marginTop: '0.75rem' }}>
              {track?.title ?? 'silence'}
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted)', marginTop: '0.5rem' }}>
              {track ? `${track.artist}${track.album ? ` · ${track.album}` : ''}` : 'nothing on the speakers at the moment'}
            </p>
            <div className="flex items-end gap-1.5" style={{ height: 32, marginTop: '1.75rem' }} aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} className={`eq-bar${playing ? ' animate' : ''}`} style={{ height: h, animationDelay: `${i * 0.12}s`, opacity: playing ? 1 : 0.4 }} />
              ))}
            </div>
            {track?.track_url && (
              <a href={track.track_url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70 inline-block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: '1.75rem' }}>
                open in spotify ↗
              </a>
            )}
          </div>
        </div>

        {/* content sections */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-16 gap-y-12" style={{ marginTop: '5rem', borderTop: '1px solid var(--rule)', paddingTop: '3rem' }}>
          {/* current rotation */}
          <div className="md:col-span-7">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>current rotation</div>
            <div>
              {ROTATION.map((r, i) => (
                <div key={i} className="grid items-baseline" style={{ gridTemplateColumns: '32px 1fr auto', gap: 16, paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid var(--rule)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--fg)' }}>{r.track}</span>
                  <span className="truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{r.artist}</span>
                </div>
              ))}
            </div>
          </div>

          {/* the system + this month */}
          <div className="md:col-span-5">
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '1.25rem' }}>the system</div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--fg)' }}>
              every song i catch in an instagram reel gets saved to one playlist, &ldquo;of insta&rdquo;.
              it is up to ~1130 tracks now and still growing. a slow, accidental archive of whatever
              caught my ear.
            </p>
            <a href="https://open.spotify.com/user/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70 inline-block" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', marginTop: '1rem' }}>
              the &apos;of insta&apos; playlist ↗
            </a>

            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', margin: '2rem 0 0.75rem' }}>this month</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)' }}>
              heavy on bedroom-pop and breakup anthems while rebuilding this site. footer&apos;s live
              ticker has the real-time truth.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
