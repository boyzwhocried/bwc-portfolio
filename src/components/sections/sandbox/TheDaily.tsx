'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import {
  CODE_LEN, MAX_GUESSES, dayIndex, dailyCode, scoreGuess, updateStreak,
  buildShareGrid, isWin, type Feedback, type StreakState,
} from '@/lib/sandbox/daily'

const STORAGE_KEY = 'bwc-daily-v1'
const LAUNCH_DAY = Math.floor(Date.parse('2026-06-12T00:00:00Z') / 86_400_000)

// letterpress palette: colour + a redundant glyph (colour-blind safe)
const PEGS = [
  { c: '#e84c28', g: '●' },
  { c: '#2f7d86', g: '■' },
  { c: '#caa23a', g: '▲' },
  { c: '#5a8f4a', g: '◆' },
  { c: '#4b5e9e', g: '★' },
  { c: '#8a4f6d', g: '✚' },
]
const INK = '#1a1a1a'
const PAPER = '#efe9dd'

type Saved = {
  day: number
  guesses: number[][]
  feedback: Feedback[]
  status: 'playing' | 'won' | 'lost'
  streak: StreakState | null
}

function load(): Saved | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

export default function TheDaily({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => dayIndex(new Date()), [])
  const code = useMemo(() => dailyCode(new Date()), [])
  const puzzleNo = today - LAUNCH_DAY + 1
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
    []
  )

  const [state, setState] = useState<Saved>(() => {
    const s = load()
    if (s && s.day === today) return s
    return { day: today, guesses: [], feedback: [], status: 'playing', streak: s?.streak ?? null }
  })
  const [input, setInput] = useState<number[]>([])
  const [copied, setCopied] = useState(false)
  const [, force] = useState(0)

  // persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  // countdown tick once locked
  const locked = state.status !== 'playing'
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (!locked) return
    tickRef.current = setInterval(() => force((n) => n + 1), 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [locked])

  function submit() {
    if (locked || input.length !== CODE_LEN) return
    const fb = scoreGuess(input, code)
    const guesses = [...state.guesses, input]
    const feedback = [...state.feedback, fb]
    let status: Saved['status'] = 'playing'
    let streak = state.streak
    if (isWin(fb)) { status = 'won'; streak = updateStreak(state.streak, today, true) }
    else if (guesses.length >= MAX_GUESSES) { status = 'lost'; streak = updateStreak(state.streak, today, false) }
    setState({ day: today, guesses, feedback, status, streak })
    setInput([])
  }

  function share() {
    const grid = buildShareGrid(puzzleNo, state.feedback, state.status === 'won')
    navigator.clipboard?.writeText(grid).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  function countdown() {
    const ms = (today + 1) * 86_400_000 - Date.now()
    const h = Math.floor(ms / 3.6e6)
    const m = Math.floor((ms % 3.6e6) / 6e4)
    const s = Math.floor((ms % 6e4) / 1000)
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  }

  const rows = Array.from({ length: MAX_GUESSES })

  return (
    <SandboxModal
      title="the daily"
      onClose={onClose}
      width={420}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>NO.{puzzleNo} · {dateLabel}</span>}
    >
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: '#4a443a', lineHeight: 1.5, marginBottom: 14 }}>
          crack the four-peg code in six tries. <strong style={{ color: INK }}>●</strong> right peg, right spot · <span style={{ color: '#b83612' }}>○</span> right peg, wrong spot. one puzzle a day.
        </p>

        {/* board */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((_, ri) => {
            const past = ri < state.guesses.length
            const cur = ri === state.guesses.length && !locked
            const pegs = past ? state.guesses[ri] : cur ? input : []
            const fb = past ? state.feedback[ri] : null
            return (
              <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {Array.from({ length: CODE_LEN }).map((__, ci) => {
                    const p = pegs[ci]
                    const filled = p !== undefined
                    return (
                      <div
                        key={ci}
                        style={{
                          width: 34, height: 34, border: `1.5px solid ${INK}`,
                          background: filled ? PEGS[p].c : '#fff',
                          boxShadow: past ? 'none' : `2px 2px 0 ${filled ? INK : '#cfc7b8'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, color: '#f4efe4', borderRadius: 2,
                        }}
                      >
                        {filled ? PEGS[p].g : ''}
                      </div>
                    )
                  })}
                </div>
                {/* feedback pegs 2x2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: 18 }}>
                  {Array.from({ length: CODE_LEN }).map((__, k) => {
                    let bg = 'transparent'
                    let bd = '#cfc7b8'
                    if (fb) {
                      if (k < fb.exact) { bg = INK; bd = INK }
                      else if (k < fb.exact + fb.present) { bg = '#e84c28'; bd = '#b83612' }
                    }
                    return <span key={k} style={{ width: 7, height: 7, background: bg, border: `1px solid ${bd}`, borderRadius: '50%' }} />
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* controls */}
        {!locked ? (
          <>
            <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
              {PEGS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setInput((v) => (v.length < CODE_LEN ? [...v, i] : v))}
                  aria-label={`peg ${i}`}
                  style={{
                    width: 36, height: 36, background: p.c, border: `1.5px solid ${INK}`,
                    boxShadow: `2px 2px 0 ${INK}`, cursor: 'pointer', color: '#f4efe4', fontSize: 17, borderRadius: 2,
                  }}
                >
                  {p.g}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setInput((v) => v.slice(0, -1))} style={ctrlBtn}>delete</button>
              <button
                onClick={submit}
                disabled={input.length !== CODE_LEN}
                style={{ ...ctrlBtn, background: input.length === CODE_LEN ? '#e84c28' : '#d8d2c6', color: input.length === CODE_LEN ? '#fff' : '#8a8276', flex: 1 }}
              >
                guess
              </button>
            </div>
          </>
        ) : (
          <div style={{ marginTop: 16, borderTop: `1px solid #d8d2c6`, paddingTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: state.status === 'won' ? '#3a7d3a' : '#b83612' }}>
              {state.status === 'won' ? 'cracked it.' : 'out of tries.'}
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a443a' }}>
              <span>streak <strong style={{ color: INK, fontSize: 14 }}>{state.streak?.streak ?? 0}</strong></span>
              <span>best <strong style={{ color: INK, fontSize: 14 }}>{state.streak?.best ?? 0}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <button onClick={share} style={{ ...ctrlBtn, background: INK, color: PAPER }}>{copied ? 'copied ✓' : 'share result'}</button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>next in {countdown()}</span>
            </div>
          </div>
        )}
      </div>
    </SandboxModal>
  )
}

const ctrlBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK,
  background: '#fff', border: `1.5px solid ${INK}`, padding: '8px 14px',
  cursor: 'pointer', borderRadius: 2,
}
