'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import {
  scoreBisect, scoreThirds, scoreQuarter, scoreGolden, scoreAngle, scorePosition,
  aggregate, isPersonalBest, GOLDEN,
} from '@/lib/sandbox/calib'

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

// a round is a bar-click (find a fraction by eye), a dial (rotate a needle), or
// a sweep (stop a moving needle). adding a variant is a row here, not a branch.
type RoundKind = 'bar' | 'dial' | 'sweep'
type RoundDef = {
  name: string
  kind: RoundKind
  target?: number // bar rounds: the fraction to find
  score?: (frac: number) => number // bar rounds: scorer
  dial?: 'hit' | 'level' // dial rounds: hit a target, or null back to 0
  hint?: string // bar/sweep static hint (dial hints are dynamic, set inline)
}

const ROUNDS: RoundDef[] = [
  { name: 'BISECT', kind: 'bar', target: 0.5, score: scoreBisect, hint: 'click the exact midpoint of the bar. no center mark to help you.' },
  { name: 'THIRDS', kind: 'bar', target: 1 / 3, score: scoreThirds, hint: 'now the one-third mark — the left third, by eye alone.' },
  { name: 'QUARTER', kind: 'bar', target: 0.25, score: scoreQuarter, hint: 'the quarter mark: one fourth in from the left edge.' },
  { name: 'ANGLE', kind: 'dial', dial: 'hit' },
  { name: 'LEVEL', kind: 'dial', dial: 'level' },
  { name: 'GOLDEN', kind: 'bar', target: GOLDEN, score: scoreGolden, hint: 'the golden section — about 0.618 along. trust the eye, not the math.' },
  { name: 'STOP', kind: 'sweep', hint: 'freeze the needle inside the lit band.' },
]
const ROUND_NAMES = ROUNDS.map((r) => r.name)
const ROUNDS_N = ROUNDS.length

export default function TheRig({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0) // 0..ROUNDS_N-1 rounds, ROUNDS_N = done
  const [scores, setScores] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [roundScore, setRoundScore] = useState(0)
  // lazy init: this modal only mounts client-side (on toy click), so localStorage is safe
  const [saved, setSaved] = useState<Saved>(() => load())

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

  const round = phase < ROUNDS_N ? ROUNDS[phase] : null

  // enter a round and randomize its target (called from event handlers, never an
  // effect, so there is no set-state-in-effect churn).
  function startRound(p: number) {
    setRevealed(false)
    setRoundScore(0)
    const def = ROUNDS[p]
    if (def.kind === 'bar') setBisectMark(null)
    if (def.kind === 'dial' && def.dial === 'hit') { setAngleTarget(15 + Math.floor(Math.random() * 330)); setNeedleDeg(180) }
    if (def.kind === 'dial' && def.dial === 'level') { setAngleTarget(0); setNeedleDeg(40 + Math.floor(Math.random() * 280)) }
    if (def.kind === 'sweep') { setSweepTarget(0.18 + Math.random() * 0.64); setSweepFrozen(null) }
  }

  // sweep animation — tighter band (10%) makes STOP less forgiving than before
  useEffect(() => {
    if (round?.kind !== 'sweep' || revealed) return
    let raf = 0
    const t0 = performance.now()
    function frame(t: number) {
      const pos = 0.5 + 0.48 * Math.sin((t - t0) / 320)
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
  }, [round?.kind, revealed])

  function commitRound(s: number) {
    setRoundScore(s)
    setRevealed(true)
  }

  function nextRound() {
    const all = [...scores, roundScore]
    setScores(all)
    if (phase < ROUNDS_N - 1) { setPhase(phase + 1); startRound(phase + 1) }
    else {
      const agg = aggregate(all)
      const cur = load()
      const pb = isPersonalBest(agg, cur.pb) ? agg : cur.pb
      const history = [...cur.history, agg].slice(-10)
      const next = { pb, history }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      setSaved(next)
      setPhase(ROUNDS_N)
    }
  }

  function restart() {
    setScores([])
    setPhase(0)
    startRound(0)
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
  const isNewPB = phase === ROUNDS_N && saved.history.length > 0 && agg >= saved.pb && agg > 0
  const dialTargetDeg = round?.dial === 'level' ? 0 : angleTarget // LEVEL nulls back to 0°

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
        {round && (
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: PHOS, letterSpacing: '0.12em' }}>
              {phase + 1}/{ROUNDS_N} · {round.name}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b746f' }}>calibrate by feel</span>
          </div>
        )}

        {/* BAR ROUNDS — bisect / thirds / quarter / golden share one renderer */}
        {round?.kind === 'bar' && (
          <div>
            <p style={hint}>{round.hint}</p>
            <div
              onClick={(e) => {
                if (revealed) return
                const r = e.currentTarget.getBoundingClientRect()
                const frac = (e.clientX - r.left) / r.width
                setBisectMark(frac)
                commitRound(round.score!(frac))
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
                <div style={{ position: 'absolute', top: 8, left: `${(round.target! * 100).toFixed(3)}%`, width: 2, height: 38, background: PHOS, transform: 'translateX(-1px)', opacity: 0.7 }} />
              )}
            </div>
          </div>
        )}

        {/* DIAL ROUNDS — ANGLE (hit a target) and LEVEL (null back to 0) */}
        {round?.kind === 'dial' && (
          <div style={{ textAlign: 'center' }}>
            <p style={hint}>
              {round.dial === 'level'
                ? <>the dial drifted off zero. bring the needle back to <strong style={{ color: PHOS }}>0°</strong> (top, lit green). level it by eye.</>
                : <>rotate the needle to <strong style={{ color: PHOS }}>{angleTarget}°</strong>. zero is at the top, clockwise.</>}
            </p>
            <div
              ref={dialRef}
              onPointerDown={(e) => { if (revealed) return; draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); setNeedleDeg(dialAngle(e.clientX, e.clientY)) }}
              onPointerMove={(e) => { if (draggingRef.current && !revealed) setNeedleDeg(dialAngle(e.clientX, e.clientY)) }}
              onPointerUp={() => { draggingRef.current = false }}
              style={{ position: 'relative', width: 170, height: 170, margin: '22px auto 26px', borderRadius: '50%', border: `2px solid ${TICK}`, background: 'radial-gradient(circle, #23282b, #15181a)', touchAction: 'none', cursor: revealed ? 'default' : 'grab' }}
            >
              {/* tick ring */}
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: 1, height: 8, background: TICK, transformOrigin: '50% 0', transform: `rotate(${i * 15}deg) translate(-50%, 75px)` }} />
              ))}
              {/* degree origin: the starting-point reference at top (0°), matching needle-up */}
              <div style={{ position: 'absolute', top: 3, left: '50%', width: 3, height: 13, background: PHOS, transform: 'translateX(-50%)', borderRadius: 1 }} />
              {/* cardinal labels — fix the 0° start + clockwise direction */}
              {[0, 90, 180, 270].map((d) => {
                const rad = (d * Math.PI) / 180
                const R = 99
                return (
                  <span
                    key={d}
                    style={{
                      position: 'absolute',
                      left: 85 + R * Math.sin(rad),
                      top: 85 - R * Math.cos(rad),
                      transform: 'translate(-50%, -50%)',
                      fontFamily: 'var(--font-mono)', fontSize: 9, lineHeight: 1,
                      color: d === 0 ? PHOS : '#6b746f',
                      fontWeight: d === 0 ? 700 : 400,
                    }}
                  >
                    {d}°
                  </span>
                )
              })}
              {/* live needle */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 3, height: 70, background: NEEDLE, transformOrigin: '50% 100%', transform: `translate(-50%, -100%) rotate(${needleDeg}deg)`, borderRadius: 2 }} />
              {/* target reveal */}
              {revealed && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', width: 2, height: 70, background: PHOS, opacity: 0.7, transformOrigin: '50% 100%', transform: `translate(-50%, -100%) rotate(${dialTargetDeg}deg)` }} />
              )}
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, background: '#c4ccc8', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            {!revealed && (
              <button onClick={() => commitRound(scoreAngle(dialTargetDeg, needleDeg))} style={rigBtn}>lock</button>
            )}
          </div>
        )}

        {/* SWEEP ROUND — STOP THE SWEEP */}
        {round?.kind === 'sweep' && (
          <div>
            <p style={hint}>{round.hint}</p>
            <div ref={sweepBarRef} style={{ position: 'relative', height: 46, marginTop: 18, background: '#15181a', border: `1px solid ${TICK}`, borderRadius: 2 }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(sweepTarget - 0.05) * 100}%`, width: '10%', background: 'rgba(108,240,154,0.18)', borderLeft: `1px solid ${PHOS}`, borderRight: `1px solid ${PHOS}` }} />
              <div data-needle style={{ position: 'absolute', top: -4, left: `${(sweepFrozen ?? 0.5) * 100}%`, width: 2, height: 54, background: NEEDLE, transform: 'translateX(-1px)' }} />
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
        {round && revealed && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: PHOS }}>+{roundScore}</div>
            <button onClick={nextRound} style={{ ...rigBtn, marginTop: 10 }}>{phase < ROUNDS_N - 1 ? 'next →' : 'finish'}</button>
          </div>
        )}

        {/* DONE */}
        {phase === ROUNDS_N && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b746f', letterSpacing: '0.12em' }}>CALIBRATION SCORE</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, color: PHOS, lineHeight: 1.1 }}>{agg}</div>
            {isNewPB && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: NEEDLE }}>★ new personal best</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a938e', marginTop: 6 }}>
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
