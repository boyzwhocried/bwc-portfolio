'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import Leaderboard from './Leaderboard'
import { schedule, replay, GOOD_WINDOW, PERFECT_WINDOW, LIVES, type Enemy, type Input, type Result } from '@/lib/sandbox/parry'
import { submitScore } from '@/actions/arcade'

const RES = 240
const C = RES / 2
const CORE = 24
const ESIZE = 18
const TRAVEL = 1100 // ms an enemy takes from edge to core
const MAX_ENEMIES = 400

const GREEN = '#7CFC9A'
const VERM = '#e84c28'
const PAPER = '#ece7de'

// dir 0=up 1=right 2=down 3=left -> spawn edge point
function edgeOf(dir: number): [number, number] {
  return dir === 0 ? [C, 0] : dir === 1 ? [RES, C] : dir === 2 ? [C, RES] : [0, C]
}
const KEY_DIR: Record<string, number> = {
  ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3,
}

type Mode = 'attract' | 'playing' | 'dead'

export default function Parry({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('attract')
  const [hud, setHud] = useState({ score: 0, combo: 0, lives: LIVES })
  const [final, setFinal] = useState<Result | null>(null)
  const [initials, setInitials] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [refreshKey, setRefreshKey] = useState(0)

  const seedRef = useRef(0)
  const enemiesRef = useRef<Enemy[]>([])
  const resolvedRef = useRef<Uint8Array>(new Uint8Array(0))
  const startRef = useRef(0)
  const inputsRef = useRef<Input[]>([])
  const shakeRef = useRef(0)
  const liveRef = useRef({ score: 0, combo: 0, lives: LIVES })
  const acRef = useRef<AudioContext | null>(null)

  function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12) {
    let ac = acRef.current
    if (!ac) {
      type ACtor = typeof AudioContext
      const Ctor: ACtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext
      if (!Ctor) return
      ac = new Ctor()
      acRef.current = ac
    }
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.value = vol
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + dur)
  }

  function endGame() {
    const res = replay(seedRef.current, inputsRef.current)
    setFinal(res)
    setMode('dead')
    blip(110, 0.5, 'sawtooth', 0.14)
  }

  function press(dir: number) {
    if (mode !== 'playing') return
    const t = performance.now() - startRef.current
    inputsRef.current.push({ time: t, dir })
    // live resolve: nearest unresolved enemy of this dir within the window
    const enemies = enemiesRef.current
    const resolved = resolvedRef.current
    let best = -1
    let bestDt = Infinity
    for (let i = 0; i < enemies.length; i++) {
      if (resolved[i]) continue
      if (enemies[i].dir !== dir) continue
      const dt = Math.abs(t - enemies[i].time)
      if (dt <= GOOD_WINDOW && dt < bestDt) { bestDt = dt; best = i }
      if (enemies[i].time - t > GOOD_WINDOW) break // schedule is sorted; nothing further matches
    }
    if (best === -1) { blip(180, 0.05, 'square', 0.05); return }
    resolved[best] = 1
    const L = liveRef.current
    if (bestDt <= PERFECT_WINDOW) {
      L.combo++
      L.score += 10 * L.combo
      blip(660 + Math.min(L.combo, 12) * 40, 0.07)
    } else {
      L.score += 5
      blip(440, 0.06, 'triangle')
    }
    setHud({ ...L })
  }

  function startGame() {
    seedRef.current = (Math.random() * 2 ** 31) | 0
    enemiesRef.current = schedule(seedRef.current, MAX_ENEMIES)
    resolvedRef.current = new Uint8Array(MAX_ENEMIES)
    inputsRef.current = []
    liveRef.current = { score: 0, combo: 0, lives: LIVES }
    setHud({ score: 0, combo: 0, lives: LIVES })
    setFinal(null)
    setInitials('')
    setSubmitState('idle')
    startRef.current = performance.now()
    setMode('playing')
  }

  // game loop + key handling, live only while playing
  useEffect(() => {
    if (mode !== 'playing') return
    const ctx = canvasRef.current!.getContext('2d')!
    let raf = 0

    function onKey(e: KeyboardEvent) {
      const dir = KEY_DIR[e.code]
      if (dir === undefined) return
      e.preventDefault()
      press(dir)
    }
    window.addEventListener('keydown', onKey)

    function frame() {
      const t = performance.now() - startRef.current
      const enemies = enemiesRef.current
      const resolved = resolvedRef.current
      const L = liveRef.current

      // miss sweep
      for (let i = 0; i < enemies.length; i++) {
        if (resolved[i]) continue
        if (enemies[i].time + GOOD_WINDOW < t) {
          resolved[i] = 1
          L.lives--
          L.combo = 0
          shakeRef.current = 7
          blip(90, 0.18, 'sawtooth', 0.12)
          if (L.lives <= 0) { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); endGame(); return }
        }
        if (enemies[i].time - TRAVEL > t) break // not yet on screen; rest are later
      }

      // ---- render ----
      ctx.save()
      let ox = 0, oy = 0
      if (shakeRef.current > 0) { ox = (Math.random() - 0.5) * 6; oy = (Math.random() - 0.5) * 6; shakeRef.current-- }
      ctx.translate(ox, oy)
      ctx.fillStyle = '#0d0f0d'
      ctx.fillRect(-6, -6, RES + 12, RES + 12)
      // grid
      ctx.strokeStyle = 'rgba(124,252,154,0.06)'
      ctx.lineWidth = 1
      for (let g = 0; g <= RES; g += 24) {
        ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, RES); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(RES, g); ctx.stroke()
      }
      // core
      const pulse = 1 + 0.06 * Math.sin(t / 120)
      ctx.fillStyle = PAPER
      ctx.fillRect(C - (CORE * pulse) / 2, C - (CORE * pulse) / 2, CORE * pulse, CORE * pulse)
      ctx.fillStyle = '#0d0f0d'
      ctx.fillRect(C - 4, C - 4, 8, 8)

      // enemies
      for (let i = 0; i < enemies.length; i++) {
        if (resolved[i]) continue
        const e = enemies[i]
        const p = (t - (e.time - TRAVEL)) / TRAVEL
        if (p < 0) { if (e.time - TRAVEL > t) break; else continue }
        if (p > 1.25) continue
        const [ex, ey] = edgeOf(e.dir)
        const k = Math.min(p, 1)
        const x = ex + (C - ex) * k
        const y = ey + (C - ey) * k
        const inWindow = Math.abs(t - e.time) <= GOOD_WINDOW
        ctx.fillStyle = inWindow ? '#fff' : VERM
        ctx.fillRect(x - ESIZE / 2, y - ESIZE / 2, ESIZE, ESIZE)
        if (inWindow) {
          ctx.strokeStyle = GREEN
          ctx.lineWidth = 2
          ctx.strokeRect(x - ESIZE / 2 - 2, y - ESIZE / 2 - 2, ESIZE + 4, ESIZE + 4)
        }
      }
      ctx.restore()

      if (L.score !== hud.score || L.combo !== hud.combo || L.lives !== hud.lives) setHud({ ...L })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => () => { acRef.current?.close().catch(() => {}) }, [])

  async function doSubmit() {
    setSubmitState('sending')
    const r = await submitScore(seedRef.current, inputsRef.current, initials)
    if (r.ok) { setSubmitState('done'); setRefreshKey((k) => k + 1) }
    else setSubmitState('error')
  }

  return (
    <SandboxModal
      title="PARRY"
      onClose={onClose}
      width={300}
      panelBg="#0d0f0d"
      panelFg={GREEN}
      borderColor="#000"
      titleFont="var(--font-mono)"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5a6b5e' }}>{mode === 'playing' ? `x${hud.combo}` : 'arcade'}</span>}
    >
      <div style={{ padding: 14, position: 'relative' }}>
        {/* HUD */}
        {mode === 'playing' && (
          <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: GREEN, marginBottom: 8 }}>
            <span>{String(hud.score).padStart(6, '0')}</span>
            <span style={{ color: VERM }}>{'■'.repeat(Math.max(0, hud.lives))}{'□'.repeat(Math.max(0, LIVES - hud.lives))}</span>
          </div>
        )}

        {/* screen */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#0d0f0d', border: '1px solid #1d241d' }}>
          <canvas
            ref={canvasRef}
            width={RES}
            height={RES}
            style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: mode === 'playing' ? 'block' : 'none' }}
          />
          {/* scanline overlay */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,0.28) 2px 3px)', mixBlendMode: 'multiply' }} />

          {mode === 'attract' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, color: GREEN, letterSpacing: '0.12em', textShadow: `0 0 8px ${GREEN}` }}>PARRY</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#5a6b5e', marginTop: 4, lineHeight: 1.6 }}>
                arrows / WASD to deflect<br />the incoming blocks. perfect timing<br />builds the combo. 3 lives.
              </div>
              <button onClick={startGame} style={{ ...arcBtn, marginTop: 14, animation: 'blink 1s steps(2) infinite' }}>▸ INSERT COIN</button>
            </div>
          )}

          {mode === 'dead' && final && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16, overflow: 'auto' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: VERM, letterSpacing: '0.1em' }}>GAME OVER</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#5a6b5e', marginTop: 6 }}>SCORE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 30, color: GREEN, textShadow: `0 0 8px ${GREEN}` }}>{final.score.toLocaleString()}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5a6b5e' }}>best combo x{final.maxCombo} · {final.parries} parries</div>
              {submitState !== 'done' ? (
                <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={initials}
                    onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                    placeholder="AAA"
                    aria-label="enter initials"
                    style={{ width: 56, textAlign: 'center', background: '#000', border: `1px solid ${GREEN}`, color: GREEN, fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.2em', padding: '4px 0' }}
                  />
                  <button onClick={doSubmit} disabled={submitState === 'sending' || initials.length === 0} style={arcBtn}>
                    {submitState === 'sending' ? '...' : submitState === 'error' ? 'retry' : 'SUBMIT'}
                  </button>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: GREEN, marginTop: 8 }}>★ on the board</div>
              )}
              <button onClick={startGame} style={{ ...arcBtn, marginTop: 10 }}>PLAY AGAIN</button>
            </div>
          )}
        </div>

        {/* touch dpad while playing */}
        {mode === 'playing' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, width: 120, margin: '10px auto 0' }}>
            <span />
            <button onPointerDown={(e) => { e.preventDefault(); press(0) }} style={dpad}>▲</button>
            <span />
            <button onPointerDown={(e) => { e.preventDefault(); press(3) }} style={dpad}>◀</button>
            <span />
            <button onPointerDown={(e) => { e.preventDefault(); press(1) }} style={dpad}>▶</button>
            <span />
            <button onPointerDown={(e) => { e.preventDefault(); press(2) }} style={dpad}>▼</button>
            <span />
          </div>
        )}

        {/* leaderboard on attract + dead */}
        {mode !== 'playing' && (
          <div style={{ marginTop: 14, borderTop: '1px solid #1d241d', paddingTop: 12 }}>
            <Leaderboard game="parry" refreshKey={refreshKey} />
          </div>
        )}
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0.35 } }`}</style>
    </SandboxModal>
  )
}

const arcBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: '#0d0f0d',
  background: GREEN, border: 'none', padding: '7px 14px', cursor: 'pointer', letterSpacing: '0.08em',
}
const dpad: React.CSSProperties = {
  aspectRatio: '1', background: '#11160f', border: `1px solid ${GREEN}`, color: GREEN,
  fontSize: 14, cursor: 'pointer', borderRadius: 3, touchAction: 'none',
}
