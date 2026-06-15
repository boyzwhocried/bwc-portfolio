'use client'

import { useEffect, useMemo, useState } from 'react'
import SandboxModal from './SandboxModal'
import { dayIndex, updateStreak, type StreakState } from '@/lib/sandbox/daily'
import { dailyPicross, rowClues, colClues, isSolved, buildImposeShare, PIC_SIZE } from '@/lib/sandbox/picross'

const STORAGE_KEY = 'bwc-impose-v1'
const LAUNCH_DAY = Math.floor(Date.parse('2026-06-15T00:00:00Z') / 86_400_000)
const PAPER = '#efe9dd'
const INK = '#1a1a1a'
const GRIDLINE = 'rgba(26,26,26,0.14)'

type Mode = 'fill' | 'cross'
type Saved = { day: number; fill: boolean[][]; cross: boolean[][]; status: 'playing' | 'won'; streak: StreakState | null }

const blank = () => Array.from({ length: PIC_SIZE }, () => Array.from({ length: PIC_SIZE }, () => false))

function load(): Saved | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

export default function TheImpose({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => dayIndex(new Date()), [])
  const solution = useMemo(() => dailyPicross(new Date()), [])
  const rClues = useMemo(() => rowClues(solution), [solution])
  const cClues = useMemo(() => colClues(solution), [solution])
  const puzzleNo = today - LAUNCH_DAY + 1
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
    []
  )

  const [state, setState] = useState<Saved>(() => {
    const s = load()
    if (s && s.day === today) return s
    return { day: today, fill: blank(), cross: blank(), status: 'playing', streak: s?.streak ?? null }
  })
  const [mode, setMode] = useState<Mode>('fill')
  const [msg, setMsg] = useState('')
  const [nowMs, setNowMs] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  const locked = state.status !== 'playing'
  useEffect(() => {
    if (!locked) return
    const seed = requestAnimationFrame(() => setNowMs(Date.now()))
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => { cancelAnimationFrame(seed); clearInterval(id) }
  }, [locked])

  function tap(r: number, c: number) {
    if (locked) return
    const fill = state.fill.map((row) => row.slice())
    const cross = state.cross.map((row) => row.slice())
    if (mode === 'fill') { fill[r][c] = !fill[r][c]; if (fill[r][c]) cross[r][c] = false }
    else { cross[r][c] = !cross[r][c]; if (cross[r][c]) fill[r][c] = false }
    setState({ ...state, fill, cross })
    if (msg) setMsg('')
  }

  function check() {
    if (locked) return
    if (isSolved(state.fill, solution)) {
      const streak = updateStreak(state.streak, today, true)
      setState({ ...state, status: 'won', streak })
    } else {
      setMsg('not imposed yet. keep reading the counts.')
      window.setTimeout(() => setMsg(''), 1900)
    }
  }

  function reset() {
    if (locked) return
    setState({ ...state, fill: blank(), cross: blank() })
  }

  function share() {
    const line = buildImposeShare(puzzleNo, state.status === 'won', state.streak?.streak ?? 0)
    navigator.clipboard?.writeText(line).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {})
  }

  function countdown() {
    if (nowMs === 0) return '…'
    const ms = (today + 1) * 86_400_000 - nowMs
    const h = Math.floor(ms / 3.6e6)
    const m = Math.floor((ms % 3.6e6) / 6e4)
    const s = Math.floor((ms % 6e4) / 1000)
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  }

  const CELL = 34
  const GUT = 46 // clue gutter

  return (
    <SandboxModal
      title="the impose"
      onClose={onClose}
      width={400}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>NO.{puzzleNo} · {dateLabel}</span>}
    >
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: '#4a443a', lineHeight: 1.7, marginBottom: 6 }}>
          the counts beside each row and column say how many cells of ink sit there, in order.
          fill the forme to reveal the day&apos;s glyph. one a day.
        </p>

        <details style={{ marginBottom: 10 }}>
          <summary style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', cursor: 'pointer', listStyle: 'revert' }}>
            how to play
          </summary>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: '#4a443a', lineHeight: 1.7, marginTop: 6, borderLeft: `2px solid #d8d2c6`, paddingLeft: 10 }}>
            <p style={{ marginBottom: 6 }}>
              each number is the length of a solid run of ink in that line. several numbers means
              several runs, in that order, with at least one blank between them.
            </p>
            <p style={{ marginBottom: 6 }}>
              a row marked <strong>2 1</strong> reads: two inked cells together, a gap, then one more
              (like <span style={{ fontFamily: 'var(--font-mono)' }}>█ █ · · █</span>).
            </p>
            <p style={{ marginBottom: 0 }}>
              tap in <strong>fill</strong> to ink a cell, or <strong>cross</strong> to mark one you
              know is blank. find a line that fits only one way, lock it, and the crossing counts
              force the rest. then hit check.
            </p>
          </div>
        </details>

        {!locked && (state.streak?.streak ?? 0) > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9a7b32', marginBottom: 8 }}>
            streak of {state.streak!.streak} on the line today.
          </p>
        )}

        {/* board with clue gutters */}
        <div style={{ display: 'grid', gridTemplateColumns: `${GUT}px repeat(${PIC_SIZE}, ${CELL}px)`, margin: '12px auto 0', width: 'fit-content' }}>
          {/* corner */}
          <div style={{ width: GUT, height: GUT }} />
          {/* column clues */}
          {cClues.map((clue, c) => (
            <div key={c} style={{ height: GUT, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a443a', lineHeight: 1.15 }}>
              {(clue.length ? clue : [0]).map((n, k) => <span key={k}>{n}</span>)}
            </div>
          ))}
          {/* rows */}
          {Array.from({ length: PIC_SIZE }).map((_, r) => (
            <Row
              key={r}
              r={r}
              clue={rClues[r].length ? rClues[r] : [0]}
              fill={state.fill[r]}
              cross={state.cross[r]}
              cell={CELL}
              gut={GUT}
              locked={locked}
              onTap={tap}
            />
          ))}
        </div>

        {!locked ? (
          <>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
              <button onClick={() => setMode('fill')} style={modeBtn(mode === 'fill')}>■ fill</button>
              <button onClick={() => setMode('cross')} style={modeBtn(mode === 'cross')}>✕ cross</button>
              <button onClick={reset} style={{ ...ctrlBtn, marginLeft: 'auto' }}>clear</button>
            </div>
            <div style={{ minHeight: 14, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#b83612' }}>{msg}</div>
            <button onClick={check} style={{ ...ctrlBtn, background: '#e84c28', color: '#fff', width: '100%', marginTop: 2 }}>check</button>
          </>
        ) : (
          <div style={{ marginTop: 16, borderTop: '1px solid #d8d2c6', paddingTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#3a7d3a' }}>imposed. glyph locked.</div>
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

function Row({ r, clue, fill, cross, cell, gut, locked, onTap }: {
  r: number; clue: number[]; fill: boolean[]; cross: boolean[]; cell: number; gut: number; locked: boolean; onTap: (r: number, c: number) => void
}) {
  return (
    <>
      <div style={{ width: gut, height: cell, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, paddingRight: 7, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a443a' }}>
        {clue.map((n, k) => <span key={k}>{n}</span>)}
      </div>
      {fill.map((on, c) => (
        <button
          key={c}
          onClick={() => onTap(r, c)}
          disabled={locked}
          aria-label={`cell ${r + 1},${c + 1}`}
          style={{
            width: cell, height: cell, padding: 0,
            borderRight: `1px solid ${GRIDLINE}`, borderBottom: `1px solid ${GRIDLINE}`,
            borderTop: r === 0 ? `1.5px solid ${INK}` : 'none',
            borderLeft: c === 0 ? `1.5px solid ${INK}` : 'none',
            background: on ? INK : '#fff',
            cursor: locked ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#b8b0a2', fontFamily: 'var(--font-mono)', fontSize: 13,
          }}
        >
          {!on && cross[c] ? '✕' : ''}
        </button>
      ))}
    </>
  )
}

const ctrlBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK,
  background: '#fff', border: `1.5px solid ${INK}`, padding: '8px 14px',
  cursor: 'pointer', borderRadius: 2,
}

function modeBtn(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
    color: active ? PAPER : INK, background: active ? INK : '#fff',
    border: `1.5px solid ${INK}`, padding: '8px 14px', cursor: 'pointer', borderRadius: 2,
  }
}
