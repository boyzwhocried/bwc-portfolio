'use client'

import { useEffect, useMemo, useState } from 'react'
import SandboxModal from './SandboxModal'
import {
  CODE_LEN, MAX_GUESSES, dayIndex, dailyCode, markGuess, updateStreak,
  buildShareGrid, isWin, hardModeViolation, type Mark, type StreakState,
} from '@/lib/sandbox/daily'

const STORAGE_KEY = 'bwc-lockup-v1'
const HARD_KEY = 'bwc-lockup-hard'
const LAUNCH_DAY = Math.floor(Date.parse('2026-06-15T00:00:00Z') / 86_400_000)

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

// wordle-style verdict, PER PEG (positional): each guess peg gets its own mark
// in the slot directly beneath it, so the tile lines up 1:1 with the peg above.
const FB_EXACT = '#3a7d3a'   // green — right peg, right spot
const FB_PRESENT = '#e0a32a' // amber — right peg, wrong spot
const FB_MISS = '#e3ddd0'    // pale — not in the code
const MARK_BG: Record<Mark, string> = { hit: FB_EXACT, present: FB_PRESENT, miss: FB_MISS }
const MARK_BD: Record<Mark, string> = { hit: '#2f6630', present: '#b3801c', miss: '#cfc7b8' }
const MARK_GLYPH: Record<Mark, string> = { hit: '✓', present: '•', miss: '' }

type Saved = {
  day: number
  guesses: number[][]
  feedback: Mark[][]
  status: 'playing' | 'won' | 'lost'
  streak: StreakState | null
}

function load(): Saved | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

function loadHard(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(HARD_KEY) === '1' } catch { return false }
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
  const [nowMs, setNowMs] = useState(0) // wall clock for the countdown, fed by the locked-state interval
  const [hard, setHard] = useState<boolean>(() => loadHard()) // hard mode: clues must be reused
  const [err, setErr] = useState('') // transient hard-mode rejection note

  // persist
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  // persist the hard-mode preference across days
  useEffect(() => {
    try { localStorage.setItem(HARD_KEY, hard ? '1' : '0') } catch {}
  }, [hard])

  // countdown clock once locked. setState only from callbacks (rAF seed + interval),
  // never synchronously in the effect body, and Date.now() never runs during render.
  const locked = state.status !== 'playing'
  useEffect(() => {
    if (!locked) return
    const seed = requestAnimationFrame(() => setNowMs(Date.now()))
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => { cancelAnimationFrame(seed); clearInterval(id) }
  }, [locked])

  function submit() {
    if (locked || input.length !== CODE_LEN) return
    if (hard && state.guesses.length > 0) {
      const reason = hardModeViolation(input, state.guesses[state.guesses.length - 1], state.feedback[state.feedback.length - 1])
      if (reason) { setErr(reason); window.setTimeout(() => setErr(''), 1700); return }
    }
    const fb = markGuess(input, code)
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
    if (nowMs === 0) return '…'
    const ms = (today + 1) * 86_400_000 - nowMs
    const h = Math.floor(ms / 3.6e6)
    const m = Math.floor((ms % 3.6e6) / 6e4)
    const s = Math.floor((ms % 6e4) / 1000)
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  }

  const rows = Array.from({ length: MAX_GUESSES })

  return (
    <SandboxModal
      title="the lockup"
      onClose={onClose}
      width={420}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>NO.{puzzleNo} · {dateLabel}</span>}
    >
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: '#4a443a', lineHeight: 1.7, marginBottom: 10 }}>
          crack the five-peg lockup in six tries. each peg is marked right below it:{' '}
          <span style={legendSwatch(FB_EXACT)}>✓</span> right peg &amp; spot ·{' '}
          <span style={legendSwatch(FB_PRESENT)}>•</span> right peg, wrong spot ·{' '}
          <span style={legendSwatch(FB_MISS)}> </span> not in the code. one puzzle a day.
        </p>

        {/* loss-aversion nudge: a live streak has something to lose. kept quiet. */}
        {!locked && (state.streak?.streak ?? 0) > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9a7b32', marginBottom: 12 }}>
            streak of {state.streak!.streak} on the line today.
          </p>
        )}

        {/* board — each column is a peg with its positional verdict directly beneath */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((_, ri) => {
            const past = ri < state.guesses.length
            const cur = ri === state.guesses.length && !locked
            const pegs = past ? state.guesses[ri] : cur ? input : []
            const marks = past ? state.feedback[ri] : null
            return (
              <div key={ri} style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: CODE_LEN }).map((__, ci) => {
                  const p = pegs[ci]
                  const filled = p !== undefined
                  const m = marks ? marks[ci] : null
                  return (
                    <div key={ci} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div
                        style={{
                          width: 34, height: 34, border: `1.5px solid ${INK}`,
                          background: filled ? PEGS[p].c : '#fff',
                          boxShadow: past ? 'none' : `2px 2px 0 ${filled ? INK : '#cfc7b8'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, color: '#f4efe4', borderRadius: 2,
                          opacity: m === 'miss' ? 0.5 : 1,
                        }}
                      >
                        {filled ? PEGS[p].g : ''}
                      </div>
                      <div
                        style={{
                          width: 34, height: 13, borderRadius: 2,
                          background: m ? MARK_BG[m] : 'transparent',
                          border: `1px solid ${m ? MARK_BD[m] : 'transparent'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, lineHeight: 1, color: '#f4efe4', fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {m ? MARK_GLYPH[m] : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* controls */}
        {!locked ? (
          <>
            {/* hard-mode rejection note (transient) */}
            <div style={{ minHeight: 14, marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#b83612' }}>
              {err && `✕ ${err}`}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
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
            {/* hard mode: optional self-imposed difficulty for the obsessed */}
            <button
              onClick={() => setHard((h) => !h)}
              aria-pressed={hard}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, padding: 0,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: 10, color: hard ? INK : '#8a8276',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 2, border: `1.5px solid ${hard ? INK : '#b3ada0'}`,
                background: hard ? INK : 'transparent', color: PAPER, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 9, lineHeight: 1,
              }}>{hard ? '✓' : ''}</span>
              hard mode {state.guesses.length > 0 && hard && '· clues must be reused'}
              {state.guesses.length === 0 && ' · every clue must be reused'}
            </button>
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

// inline legend chip mirroring the feedback tiles, so the key matches the board
function legendSwatch(bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 15, height: 15, background: bg, border: `1px solid ${INK}`,
    borderRadius: 2, color: '#f4efe4', fontSize: 9, lineHeight: 1,
    verticalAlign: 'text-bottom', marginRight: 1,
  }
}
