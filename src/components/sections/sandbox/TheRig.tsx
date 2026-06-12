'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import { scoreBisect, scoreAngle, scorePosition, aggregate, isPersonalBest } from '@/lib/sandbox/calib'

const STORAGE_KEY = 'bwc-rig-v1'
const PHOS = '#6cf09a'
const PANEL = '#1b1e21'
const TICK = '#3a4046'
const NEEDLE = '#e84c28'

type Saved = { pb: number; history: number[] }
function load(): Saved {
  if (typeof window === 'undefined') return { pb: 0, history: [] }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Saved } catch { return { pb: 0, history: [] } }
}

const ROUND_NAMES = ['BISECT', 'ANGLE', 'STOP']

export default function TheRig({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0) // 0..2 rounds, 3 = done
  const [scores, setScores] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [roundScore, setRoundScore] = useState(0)
  const [saved, setSaved] = useState<Saved>({ pb: 0, history: [] })

  // round targets
  const [angleTarget, setAngleTarget] = useState(0)
  const [sweepTarget, setSweepTarget] = useState(0.5)
  const [needleDeg, setNeedleDeg] = useState(0)
  const [bisectMark, setBisectMark] = useState<number | null>(null)
  const sweepPosRef = useRef(0.5)
  const [sweepFrozen, setSweepFrozen] = useState<number | null>(null)
  const dialRef = useRef<HTMLDivElement>(null)
  const sweepBarRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => { setSaved(load()) }, [])

  // start a round: randomize its target
  function startRound(p: number) {
    setRevealed(false)
    setRoundScore(0)
    if (p === 1) { setAngleTarget(15 + Math.floor(Math.random() * 330)); setNeedleDeg(180) }
    if (p === 2) { setSweepTarget(0.18 + Math.random() * 0.64); setSweepFrozen(null) }
    if (p === 0) setBisectMark(null)
  }
  useEffect(() => { if (phase < 3) startRound(phase) }, [phase])

  // sweep animation
  useEffect(() => {
    if (phase !== 2 || revealed) return
    let raf = 0
    const t0 = performance.now()
    function frame(t: number) {
      const pos = 0.5 + 0.48 * Math.sin((t - t0) / 360)
      sweepPosRef.current = pos
      const bar = sweepBarRef.current
      if (bar) {
        const n = bar.querySelector<HTMLElement>('[data-needle]')
        if (n) n.style.left = `${pos * 100}%`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [phase, revealed])

  function commitRound(s: number) {
    setRoundScore(s)
    setRevealed(true)
  }

  function nextRound() {
    const all = [...scores, roundScore]
    setScores(all)
    if (phase < 2) setPhase(phase + 1)
    else {
      const agg = aggregate(all)
      const cur = load()
      const pb = isPersonalBest(agg, cur.pb) ? agg : cur.pb
      const history = [...cur.history, agg].slice(-10)
      const next = { pb, history }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      setSaved(next)
      setPhase(3)
    }
  }

  function restart() {
    setScores([])
    setPhase(0)
  }

  // ---- angle dial helpers ----
  function dialAngle(clientX: number, clientY: number) {
    const r = dialRef.current!.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const deg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI
    return (deg + 360) % 360
  }

  const agg = aggregate(scores)
  const isNewPB = phase === 3 && saved.history.length > 0 && agg >= saved.pb && agg > 0

  return (
    <SandboxModal
      title="the rig"
      onClose={onClose}
      width={440}
      panelBg={PANEL}
      panelFg="#c4ccc8"
      borderColor="#000"
      titleFont="var(--font-mono)"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: PHOS }}>PB {saved.pb}</span>}
    >
      <div style={{ padding: 16 }}>
        {/* round readout */}
        {phase < 3 && (
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: PHOS, letterSpacing: '0.12em' }}>
              {phase + 1}/3 · {ROUND_NAMES[phase]}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b746f' }}>calibrate by feel</span>
          </div>
        )}

        {/* ROUND 0 — BISECT */}
        {phase === 0 && (
          <div>
            <p style={hint}>click the exact midpoint of the bar. no center mark to help you.</p>
            <div
              onClick={(e) => {
                if (revealed) return
                const r = e.currentTarget.getBoundingClientRect()
                const frac = (e.clientX - r.left) / r.width
                setBisectMark(frac)
                commitRound(scoreBisect(frac))
              }}
              style={{ position: 'relative', height: 54, marginTop: 16, cursor: revealed ? 'default' : 'crosshair' }}
            >
              <div style={{ position: 'absolute', top: 26, left: 0, right: 0, height: 2, background: TICK }} />
              <div style={{ position: 'absolute', top: 16, left: 0, width: 2, height: 22, background: PHOS }} />
              <div style={{ position: 'absolute', top: 16, right: 0, width: 2, height: 22, background: PHOS }} />
              {bisectMark !== null && (
                <div style={{ position: 'absolute', top: 8, left: `${bisectMark * 100}%`, width: 2, height: 38, background: NEEDLE, transform: 'translateX(-1px)' }} />
              )}
              {revealed && (
                <div style={{ position: 'absolute', top: 8, left: '50%', width: 2, height: 38, background: PHOS, transform: 'translateX(-1px)', opacity: 0.7 }} />
              )}
            </div>
          </div>
        )}

        {/* ROUND 1 — ANGLE */}
        {phase === 1 && (
          <div style={{ textAlign: 'center' }}>
            <p style={hint}>rotate the needle to <strong style={{ color: PHOS }}>{angleTarget}°</strong>. drag the dial.</p>
            <div
              ref={dialRef}
              onPointerDown={(e) => { if (revealed) return; draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); setNeedleDeg(dialAngle(e.clientX, e.clientY)) }}
              onPointerMove={(e) => { if (draggingRef.current && !revealed) setNeedleDeg(dialAngle(e.clientX, e.clientY)) }}
              onPointerUp={() => { draggingRef.current = false }}
              style={{ position: 'relative', width: 170, height: 170, margin: '14px auto', borderRadius: '50%', border: `2px solid ${TICK}`, background: 'radial-gradient(circle, #23282b, #15181a)', touchAction: 'none', cursor: revealed ? 'default' : 'grab' }}
            >
              {/* tick ring */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: 1, height: 8, background: TICK, transformOrigin: '50% 0', transform: `rotate(${i * 15}deg) translate(-50%, 75px)` }} />
              ))}
              {/* live needle */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 70, background: NEEDLE, transformOrigin: '50% 100%', transform: `translate(-50%, -100%) rotate(${needleDeg}deg)`, borderRadius: 2 }} />
              {/* target reveal */}
              {revealed && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2, height: 70, background: PHOS, opacity: 0.7, transformOrigin: '50% 100%', transform: `translate(-50%, -100%) rotate(${angleTarget}deg)` }} />
              )}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, background: '#c4ccc8', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            {!revealed && (
              <button onClick={() => commitRound(scoreAngle(angleTarget, needleDeg))} style={rigBtn}>lock</button>
            )}
          </div>
        )}

        {/* ROUND 2 — STOP THE SWEEP */}
        {phase === 2 && (
          <div>
            <p style={hint}>freeze the needle inside the lit band.</p>
            <div ref={sweepBarRef} style={{ position: 'relative', height: 46, marginTop: 18, background: '#15181a', border: `1px solid ${TICK}`, borderRadius: 2 }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(sweepTarget - 0.06) * 100}%`, width: '12%', background: 'rgba(108,240,154,0.18)', borderLeft: `1px solid ${PHOS}`, borderRight: `1px solid ${PHOS}` }} />
              <div data-needle style={{ position: 'absolute', top: -4, left: `${(sweepFrozen ?? sweepPosRef.current) * 100}%`, width: 2, height: 54, background: NEEDLE, transform: 'translateX(-1px)' }} />
            </div>
            {!revealed && (
              <button
                onClick={() => { const p = sweepPosRef.current; setSweepFrozen(p); commitRound(scorePosition(p, sweepTarget)) }}
                style={{ ...rigBtn, marginTop: 16, width: '100%' }}
              >
                STOP
              </button>
            )}
          </div>
        )}

        {/* per-round feedback */}
        {phase < 3 && revealed && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: PHOS }}>+{roundScore}</div>
            <button onClick={nextRound} style={{ ...rigBtn, marginTop: 10 }}>{phase < 2 ? 'next →' : 'finish'}</button>
          </div>
        )}

        {/* DONE */}
        {phase === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b746f', letterSpacing: '0.12em' }}>CALIBRATION SCORE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, color: PHOS, lineHeight: 1.1 }}>{agg}</div>
            {isNewPB && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: NEEDLE }}>★ new personal best</div>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a938e', marginTop: 6 }}>
              {scores.map((s, i) => <span key={i}>{ROUND_NAMES[i]} {s}</span>)}
            </div>
            {/* sparkline of last runs */}
            {saved.history.length > 1 && (
              <svg width="200" height="40" style={{ margin: '14px auto 0', display: 'block' }}>
                {saved.history.map((h, i) => {
                  const x = (i / (saved.history.length - 1)) * 196 + 2
                  const y = 38 - (h / 100) * 34
                  const prev = saved.history[i - 1]
                  if (i === 0) return <circle key={i} cx={x} cy={y} r={1.6} fill={PHOS} />
                  const px = ((i - 1) / (saved.history.length - 1)) * 196 + 2
                  const py = 38 - (prev / 100) * 34
                  return <g key={i}><line x1={px} y1={py} x2={x} y2={y} stroke={PHOS} strokeWidth={1} opacity={0.8} /><circle cx={x} cy={y} r={1.6} fill={PHOS} /></g>
                })}
              </svg>
            )}
            <button onClick={restart} style={{ ...rigBtn, marginTop: 14 }}>run again</button>
          </div>
        )}
      </div>
    </SandboxModal>
  )
}

const hint: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 11, color: '#8a938e', lineHeight: 1.5, textAlign: 'center' }
const rigBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#0e1110',
  background: PHOS, border: 'none', padding: '8px 22px', cursor: 'pointer', borderRadius: 2, letterSpacing: '0.08em',
}
