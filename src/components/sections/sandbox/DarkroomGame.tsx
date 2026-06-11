'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// the darkroom: develop one of the real film frames from /photography.
// hold to agitate (the print develops), release and FIX inside the sweet
// zone. under = thin ghost of a print; over = blacks flood. push your luck.
const PRINTS = [
  { src: '/photography/braga-night.jpg', label: 'jl. braga, night' },
  { src: '/photography/rooftops-water-tower.jpg', label: 'rooftops + water tower' },
  { src: '/photography/pertamina-night.jpg', label: 'pertamina, night' },
  { src: '/photography/taps-and-sneakers.jpg', label: 'taps and sneakers' },
  { src: '/photography/night-wagon.jpg', label: 'the night wagon' },
  { src: '/photography/checkerboard-sky.jpg', label: 'checkerboard sky' },
  { src: '/photography/dusk-silhouette.jpg', label: 'dusk silhouette' },
  { src: '/photography/supermarket-corridor.jpg', label: 'supermarket corridor' },
  { src: '/photography/blue-car.jpg', label: 'the blue car' },
  { src: '/photography/shell-dusk.jpg', label: 'shell at dusk' },
  { src: '/photography/landrover-alley.jpg', label: 'land rover alley' },
  { src: '/photography/dj-decks.jpg', label: 'the decks' },
  { src: '/photography/dirt-road-sign.jpg', label: 'dirt road sign' },
  { src: '/photography/watchtower.jpg', label: 'the watchtower' },
  { src: '/photography/converse-rack.jpg', label: 'converse on the rack' },
]

// sweet zone in develop units (0..100)
const ZONE_LO = 68
const ZONE_HI = 86
const RATE_PER_S = 26 // develop units per second while agitating

type Phase = 'developing' | 'fixed'

function verdict(d: number): { title: string; note: string } {
  if (d < ZONE_LO - 18) return { title: 'barely a ghost', note: 'you fixed way too early. the latent image stayed in the emulsion.' }
  if (d < ZONE_LO) return { title: 'underdeveloped', note: 'thin print. the shadows never came in.' }
  if (d <= ZONE_HI) return { title: 'a clean print', note: 'pulled at the right moment. hang it to dry.' }
  if (d <= ZONE_HI + 12) return { title: 'overcooked', note: 'the blacks flooded. still readable, barely.' }
  return { title: 'gone to soup', note: 'you fell asleep at the tray. solid black.' }
}

export default function DarkroomGame({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion()
  const [print, setPrint] = useState(() => PRINTS[Math.floor(Math.random() * PRINTS.length)])
  const [develop, setDevelop] = useState(0)
  const [phase, setPhase] = useState<Phase>('developing')
  const [agitating, setAgitating] = useState(false)
  const raf = useRef<number>(0)
  const last = useRef<number>(0)
  const devRef = useRef<number>(0)

  // develop while held; auto-soup fires inside the frame callback (not an
  // effect body) when the tray runs away past 120. devRef mirrors develop so
  // the callback can branch without reading state.
  useEffect(() => {
    if (!agitating || phase !== 'developing') return
    last.current = performance.now()
    const tick = (t: number) => {
      const dt = (t - last.current) / 1000
      last.current = t
      const next = Math.min(120, devRef.current + dt * RATE_PER_S)
      devRef.current = next
      setDevelop(next)
      if (next >= 120) { setPhase('fixed'); setAgitating(false); return }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [agitating, phase])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && phase === 'developing') { e.preventDefault(); setAgitating(true) }
      if (e.key === 'Enter' && phase === 'developing') fix()
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === ' ') setAgitating(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [phase, onClose])

  function fix() {
    setAgitating(false)
    setPhase('fixed')
  }

  function again() {
    setPrint(PRINTS[Math.floor(Math.random() * PRINTS.length)])
    devRef.current = 0
    setDevelop(0)
    setPhase('developing')
  }

  const d = Math.min(develop, 100)
  // visual development: dim + washed at 0, true at sweet zone, crushed past it
  const over = Math.max(0, develop - ZONE_HI)
  const brightness = phase === 'fixed' && develop > ZONE_HI
    ? Math.max(0.05, 1 - over / 30)
    : 0.15 + (d / 100) * 0.9
  const contrast = 0.4 + (d / 100) * 0.65
  const v = verdict(develop)

  return (
    <motion.div
      role="dialog"
      aria-label="the darkroom"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.quick, ease: ease.out }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: '#160404',
        color: '#e98', fontFamily: 'var(--font-mono)', display: 'flex',
        flexDirection: 'column', alignItems: 'center', padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      {/* safelight wash */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 0%, rgba(180,30,20,0.25), transparent 60%)' }} />

      <button
        onClick={onClose}
        aria-label="leave the darkroom"
        style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: '1px solid #a55', color: '#e98', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 8px', cursor: 'pointer', zIndex: 2 }}
      >
        esc to leave ✕
      </button>

      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4, opacity: 0.8 }}>the darkroom</div>
      <div style={{ fontSize: 11, marginTop: 6, opacity: 0.65, textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
        {phase === 'developing'
          ? 'hold to agitate the tray. release and FIX inside the zone. too early = ghost. too late = soup.'
          : `“${print.label}” · ${v.note}`}
      </div>

      {/* the print in the tray */}
      <div
        onPointerDown={() => phase === 'developing' && setAgitating(true)}
        onPointerUp={() => setAgitating(false)}
        onPointerLeave={() => setAgitating(false)}
        style={{
          marginTop: '1.25rem', width: 'min(78vw, 420px)', aspectRatio: '3/4',
          maxHeight: '52vh', border: '1px solid #733', background: '#000',
          position: 'relative', overflow: 'hidden', cursor: phase === 'developing' ? 'pointer' : 'default',
          touchAction: 'none', userSelect: 'none',
          transform: agitating && !reduce ? 'rotate(0.4deg)' : 'none',
        }}
      >
        <Image
          src={print.src}
          alt={phase === 'fixed' ? print.label : 'a print developing in the tray'}
          fill
          sizes="420px"
          quality={70}
          draggable={false}
          style={{ objectFit: 'cover', filter: `brightness(${brightness}) contrast(${contrast}) sepia(${Math.max(0, 0.7 - d / 100)})`, transition: 'filter 120ms linear' }}
        />
        {/* developer liquid sheen */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.05), transparent 40%)', pointerEvents: 'none' }} />
      </div>

      {/* develop meter with sweet zone */}
      <div style={{ width: 'min(78vw, 420px)', marginTop: '1rem' }}>
        <div style={{ position: 'relative', height: 14, border: '1px solid #a55', background: '#200606' }}>
          <div aria-hidden style={{ position: 'absolute', left: `${ZONE_LO}%`, width: `${ZONE_HI - ZONE_LO}%`, top: 0, bottom: 0, background: 'rgba(232,76,40,0.35)', borderLeft: '1px solid #e84c28', borderRight: '1px solid #e84c28' }} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(develop, 100)}%`, background: develop > ZONE_HI ? '#e84c28' : '#c97', transition: 'width 80ms linear' }} />
        </div>
        <div className="flex items-center justify-between" style={{ fontSize: 10, marginTop: 6, opacity: 0.7 }}>
          <span>{agitating ? 'agitating…' : phase === 'developing' ? 'tray still' : 'fixed'}</span>
          <span>{Math.round(Math.min(develop, 100))} / 100</span>
        </div>
      </div>

      {/* controls / verdict */}
      {phase === 'developing' ? (
        <button
          onClick={fix}
          style={{ marginTop: '1rem', background: '#e84c28', color: '#160404', border: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, padding: '10px 28px', cursor: 'pointer', letterSpacing: '0.08em' }}
        >
          FIX THE PRINT
        </button>
      ) : (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: develop >= ZONE_LO && develop <= ZONE_HI ? '#e84c28' : '#c97' }}>
            {v.title}
          </div>
          <div className="flex gap-3 justify-center" style={{ marginTop: 10 }}>
            <button onClick={again} style={{ background: 'none', border: '1px solid #e84c28', color: '#e84c28', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 16px', cursor: 'pointer' }}>
              develop another →
            </button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #a55', color: '#e98', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 16px', cursor: 'pointer' }}>
              leave
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 9, opacity: 0.45, marginTop: 'auto', paddingTop: '1rem' }}>
        space = agitate · enter = fix · the prints are real frames from /photography
      </div>
    </motion.div>
  )
}
