'use client'

import { useEffect, useMemo, useState } from 'react'
import SandboxModal from './SandboxModal'
import { dayIndex, updateStreak, type StreakState } from '@/lib/sandbox/daily'
import { dailyProof, gradeProof, buildProofShare, PROOF_SLIPS } from '@/lib/sandbox/proof'

const STORAGE_KEY = 'bwc-proof-v1'
const LAUNCH_DAY = Math.floor(Date.parse('2026-06-15T00:00:00Z') / 86_400_000)
const PAPER = '#efe9dd'
const INK = '#1a1a1a'
const CAUGHT = '#3a7d3a'
const MISSED = '#b83612'

type Saved = { day: number; marked: number[]; status: 'playing' | 'won' | 'lost'; streak: StreakState | null }

function load(): Saved | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

export default function TheProof({ onClose }: { onClose: () => void }) {
  const today = useMemo(() => dayIndex(new Date()), [])
  const proof = useMemo(() => dailyProof(new Date()), [])
  const puzzleNo = today - LAUNCH_DAY + 1
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
    []
  )

  const [state, setState] = useState<Saved>(() => {
    const s = load()
    if (s && s.day === today) return s
    return { day: today, marked: [], status: 'playing', streak: s?.streak ?? null }
  })
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

  const marked = new Set(state.marked)
  const grade = gradeProof(state.marked, proof.errors)

  function toggle(i: number) {
    if (locked) return
    const next = new Set(state.marked)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setState({ ...state, marked: [...next].sort((a, b) => a - b) })
  }

  function check() {
    if (locked || state.marked.length === 0) return
    const g = gradeProof(state.marked, proof.errors)
    const status: Saved['status'] = g.win ? 'won' : 'lost'
    const streak = updateStreak(state.streak, today, g.win)
    setState({ ...state, status, streak })
  }

  function share() {
    const grid = buildProofShare(puzzleNo, proof.errors, state.marked, state.status === 'won')
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

  // per-word appearance once the proof has been marked/checked
  function wordStyle(i: number): React.CSSProperties {
    const isErr = proof.errors.includes(i)
    const isMarked = marked.has(i)
    const base: React.CSSProperties = {
      fontFamily: 'var(--font-mono)', fontSize: 15, lineHeight: 1.9, cursor: locked ? 'default' : 'pointer',
      padding: '1px 4px', borderRadius: 3, color: INK, userSelect: 'none',
      borderBottom: '2px solid transparent', transition: 'background 120ms ease',
    }
    if (!locked) {
      return { ...base, background: isMarked ? 'rgba(184,54,18,0.16)' : 'transparent', borderBottom: isMarked ? `2px solid ${MISSED}` : '2px solid transparent' }
    }
    // revealed
    if (isErr && isMarked) return { ...base, background: 'rgba(58,125,58,0.18)', borderBottom: `2px solid ${CAUGHT}`, color: CAUGHT }
    if (isErr && !isMarked) return { ...base, background: 'rgba(184,54,18,0.16)', borderBottom: `2px solid ${MISSED}`, color: MISSED }
    if (!isErr && isMarked) return { ...base, textDecoration: 'line-through', color: '#9a8f80' } // false mark
    return base
  }

  return (
    <SandboxModal
      title="the proof"
      onClose={onClose}
      width={440}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>NO.{puzzleNo} · {dateLabel}</span>}
    >
      <div style={{ padding: '16px 18px' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: '#4a443a', lineHeight: 1.7, marginBottom: 6 }}>
          a fresh proof off the press has <strong>{PROOF_SLIPS} slips</strong> in it — letters swapped or
          mis-set. click every bad word, then check the proof. one a day.
        </p>

        {!locked && (state.streak?.streak ?? 0) > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9a7b32', marginBottom: 10 }}>
            streak of {state.streak!.streak} on the line today.
          </p>
        )}

        {/* the proof sheet */}
        <div style={{ background: '#fff', border: `1.5px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`, padding: '14px 14px', marginTop: 10, marginBottom: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 2px' }}>
            {proof.display.map((w, i) => (
              <span key={i} onClick={() => toggle(i)} style={wordStyle(i)}>{w}</span>
            ))}
          </div>
        </div>

        {!locked ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', flex: 1 }}>
              {state.marked.length} marked · {PROOF_SLIPS} to find
            </span>
            <button
              onClick={check}
              disabled={state.marked.length === 0}
              style={{ ...ctrlBtn, background: state.marked.length ? '#e84c28' : '#d8d2c6', color: state.marked.length ? '#fff' : '#8a8276' }}
            >
              check the proof
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14, borderTop: '1px solid #d8d2c6', paddingTop: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: state.status === 'won' ? CAUGHT : MISSED }}>
              {state.status === 'won' ? 'clean proof. all slips caught.' : `${grade.caught}/${grade.total} caught${grade.falseMarks ? ` · ${grade.falseMarks} false mark${grade.falseMarks > 1 ? 's' : ''}` : ''}.`}
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
