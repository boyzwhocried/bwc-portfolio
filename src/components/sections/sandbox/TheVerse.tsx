'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import useIsTouch from '@/lib/useIsTouch'
import { dayIndex, updateStreak, type StreakState } from '@/lib/sandbox/daily'
import { decode, isSolved, letterFrequencies, buildVerseShare, ALPHA } from '@/lib/sandbox/cipher'
import { dailyVerse, randomVerse, revealVerse, hintVerse, type Puzzle, type Difficulty } from '@/actions/verse'

const STORAGE_KEY = 'bwc-verse-v1'
const PAPER = '#efe9dd'
const INK = '#1a1a1a'
const ACCENT = '#e84c28'
const GOOD = '#3a7d3a'
const DIM = '#9a8f80'

type Mode = 'daily' | 'free'
type Reveal = { song: string; artist: string; line: string }
type Saved = {
  day: number
  mapping: Record<string, string>
  status: 'playing' | 'won'
  hints: number
  streak: StreakState | null
  reveal: Reveal | null
}

function loadSaved(): Saved | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
}

// distinct cipher letters in first-appearance order — the order the eye moves
function cipherOrder(cipherText: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const ch of cipherText) if (ch >= 'a' && ch <= 'z' && !seen.has(ch)) { seen.add(ch); out.push(ch) }
  return out
}

export default function TheVerse({ onClose }: { onClose: () => void }) {
  const isTouch = useIsTouch()
  const today = useMemo(() => dayIndex(new Date()), [])

  const [mode, setMode] = useState<Mode>('daily')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState<'playing' | 'won'>('playing')
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [hints, setHints] = useState(0)
  const [streak, setStreak] = useState<StreakState | null>(null)
  const [copied, setCopied] = useState(false)
  const [nowMs, setNowMs] = useState(0)

  const streakRef = useRef<StreakState | null>(null)
  streakRef.current = streak
  const finalized = useRef(false)

  // starters are server-revealed, locked letters
  const starterMap = useMemo<Record<string, string>>(
    () => (puzzle ? Object.fromEntries(puzzle.starters) : {}),
    [puzzle],
  )
  const locked = useMemo(() => new Set(Object.keys(starterMap)), [starterMap])
  const full = useMemo(() => ({ ...starterMap, ...userMap }), [starterMap, userMap])

  const resetBoard = useCallback((p: Puzzle, carryStreak: StreakState | null) => {
    setUserMap({})
    setStatus('playing')
    setReveal(null)
    setHints(0)
    setStreak(carryStreak)
    finalized.current = false
    setSelected(cipherOrder(p.cipherText).find((c) => !p.starters.some(([sc]) => sc === c)) ?? null)
  }, [])

  const loadDaily = useCallback(async () => {
    setLoading(true); setErr(null)
    const r = await dailyVerse()
    if (!r.ok) { setErr(r.error); setPuzzle(null); setLoading(false); return }
    setPuzzle(r.puzzle)
    const saved = loadSaved()
    if (saved && saved.day === today) {
      setUserMap(saved.mapping); setStatus(saved.status); setHints(saved.hints)
      setStreak(saved.streak); setReveal(saved.reveal)
      finalized.current = saved.status === 'won'
      setSelected(cipherOrder(r.puzzle.cipherText).find((c) => !r.puzzle.starters.some(([sc]) => sc === c) && !saved.mapping[c]) ?? null)
    } else {
      resetBoard(r.puzzle, saved?.streak ?? null)
    }
    setLoading(false)
  }, [today, resetBoard])

  const loadFree = useCallback(async (diff: Difficulty) => {
    setLoading(true); setErr(null)
    const r = await randomVerse(diff)
    if (!r.ok) { setErr(r.error); setPuzzle(null); setLoading(false); return }
    setPuzzle(r.puzzle)
    resetBoard(r.puzzle, null)
    setLoading(false)
  }, [resetBoard])

  // first load: the daily
  useEffect(() => { loadDaily() }, [loadDaily])

  // persist the daily across reloads
  useEffect(() => {
    if (mode !== 'daily' || !puzzle) return
    const s: Saved = { day: today, mapping: userMap, status, hints, streak, reveal }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }, [mode, puzzle, today, userMap, status, hints, streak, reveal])

  // win detection — fires once when the board first decodes to the solution
  useEffect(() => {
    if (!puzzle || status !== 'playing' || finalized.current) return
    if (!isSolved(puzzle.cipherText, full, puzzle.hash)) return
    finalized.current = true
    setStatus('won')
    setSelected(null)
    if (mode === 'daily') setStreak(updateStreak(streakRef.current, today, true))
    revealVerse(puzzle.ref, decode(puzzle.cipherText, full)).then((r) => { if (r.ok) setReveal(r) })
  }, [full, puzzle, status, mode, today])

  // live countdown ticker once the daily is solved
  useEffect(() => {
    if (mode !== 'daily' || status !== 'won') return
    const seed = requestAnimationFrame(() => setNowMs(Date.now()))
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => { cancelAnimationFrame(seed); clearInterval(id) }
  }, [mode, status])

  const assign = useCallback((plain: string) => {
    if (status !== 'playing' || !selected || locked.has(selected)) return
    setUserMap((prev) => {
      const next = { ...prev }
      // a plain letter is used once: clear any other (non-locked) cipher holding it
      for (const k of Object.keys(next)) if (next[k] === plain && k !== selected) delete next[k]
      if (plain) next[selected] = plain
      return next
    })
    if (puzzle) {
      const order = cipherOrder(puzzle.cipherText)
      const from = order.indexOf(selected)
      const nextC = order.slice(from + 1).concat(order.slice(0, from)).find((c) => !locked.has(c) && !userMap[c] && c !== selected)
      setSelected(nextC ?? selected)
    }
  }, [status, selected, locked, puzzle, userMap])

  const clearSel = useCallback(() => {
    if (status !== 'playing' || !selected || locked.has(selected)) return
    setUserMap((prev) => { const n = { ...prev }; delete n[selected]; return n })
  }, [status, selected, locked])

  // keyboard input (desktop): letters assign, backspace clears
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== 'playing') return
      const k = e.key.toLowerCase()
      if (k >= 'a' && k <= 'z' && k.length === 1) { e.preventDefault(); assign(k) }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearSel() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assign, clearSel, status])

  async function takeHint() {
    if (!puzzle || status !== 'playing') return
    const r = await hintVerse(puzzle.ref, Object.keys(full))
    if (!r.ok) return
    setUserMap((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(next)) if (next[k] === r.plain && k !== r.cipher) delete next[k]
      next[r.cipher] = r.plain
      return next
    })
    setHints((h) => h + 1)
  }

  function share() {
    if (!puzzle) return
    const grid = buildVerseShare(puzzle.no, puzzle.wordCount, status === 'won', hints)
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

  function switchMode(m: Mode) {
    if (m === mode) return
    setMode(m)
    if (m === 'daily') loadDaily()
    else loadFree(difficulty)
  }

  const usedPlain = useMemo(() => new Set(Object.values(full)), [full])
  const freqs = useMemo(() => (puzzle ? letterFrequencies(puzzle.cipherText) : []), [puzzle])

  return (
    <SandboxModal
      title="the verse"
      onClose={onClose}
      width={500}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>
          {mode === 'daily' && puzzle ? `NO.${puzzle.no}` : 'FREE'} · CRYPTOGRAM
        </span>
      }
    >
      <div style={{ padding: '14px 16px' }}>
        {/* mode toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Seg label="daily" on={mode === 'daily'} onClick={() => switchMode('daily')} />
          <Seg label="free play" on={mode === 'free'} onClick={() => switchMode('free')} />
          {mode === 'free' && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <Seg key={d} small label={d} on={difficulty === d} onClick={() => { setDifficulty(d); loadFree(d) }} />
              ))}
            </div>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12.5, color: '#4a443a', lineHeight: 1.6, marginBottom: 10 }}>
          a line of song lyric, enciphered — every letter swapped for another. crack the code.
          it favours the quiet verses over the hook, so the song stays hidden until you solve it.
        </p>

        {loading && <Status>decoding the wire…</Status>}
        {err && !loading && <Status tone="bad">{err}</Status>}

        {!loading && !err && puzzle && (
          <>
            {mode === 'daily' && status === 'playing' && (streak?.streak ?? 0) > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9a7b32', marginBottom: 8 }}>
                streak of {streak!.streak} on the line today.
              </p>
            )}

            {/* the cryptogram sheet */}
            <div style={{ background: '#fff', border: `1.5px solid ${INK}`, boxShadow: `2px 2px 0 ${INK}`, padding: '16px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 10, rowGap: 12 }}>
                {puzzle.cipherText.split(' ').map((word, wi) => (
                  <div key={wi} style={{ display: 'flex', gap: 2 }}>
                    {word.split('').map((ch, ci) => {
                      const isLetter = ch >= 'a' && ch <= 'z'
                      if (!isLetter) {
                        return <span key={ci} style={{ alignSelf: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: 17, color: INK, paddingBottom: 2 }}>{ch}</span>
                      }
                      const plain = full[ch]
                      const isSel = selected === ch
                      const isLock = locked.has(ch)
                      return (
                        <button
                          key={ci}
                          onClick={() => setSelected(ch)}
                          aria-label={`cipher ${ch}`}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            background: isSel ? 'rgba(232,76,40,0.14)' : 'transparent',
                            border: 'none', padding: '0 1px', cursor: status === 'playing' ? 'pointer' : 'default',
                          }}
                        >
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1,
                            minWidth: 13, height: 20, color: isLock ? GOOD : INK,
                          }}>
                            {plain ? plain.toUpperCase() : ''}
                          </span>
                          <span style={{
                            width: 15, height: 0, borderBottom: `2px solid ${isSel ? ACCENT : isLock ? GOOD : '#b8b0a2'}`,
                          }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isSel ? ACCENT : DIM }}>{ch}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {status === 'won' ? (
              <WinCard
                reveal={reveal} mode={mode} streak={streak} hints={hints}
                copied={copied} onShare={share} countdown={countdown()}
                onNext={() => loadFree(difficulty)}
              />
            ) : (
              <>
                {/* frequency strip — the solver's aid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {freqs.map((f) => (
                    <button
                      key={f.letter}
                      onClick={() => setSelected(f.letter)}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 5px', cursor: 'pointer',
                        border: `1px solid ${selected === f.letter ? ACCENT : '#d8d2c6'}`,
                        background: selected === f.letter ? 'rgba(232,76,40,0.1)' : '#fff',
                        color: full[f.letter] ? DIM : INK,
                      }}
                    >
                      {f.letter}<span style={{ color: DIM }}>·{f.count}</span>
                    </button>
                  ))}
                </div>

                {/* letter tray (works for tap and as a desktop fallback) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 3, marginBottom: 10 }}>
                  {ALPHA.split('').map((p) => (
                    <button
                      key={p}
                      onClick={() => assign(p)}
                      disabled={!selected || locked.has(selected ?? '')}
                      style={{
                        fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, padding: '6px 0', borderRadius: 2,
                        border: `1px solid ${INK}`, cursor: selected ? 'pointer' : 'default',
                        background: usedPlain.has(p) ? '#e7e0d2' : '#fff',
                        color: usedPlain.has(p) ? DIM : INK, opacity: !selected ? 0.5 : 1,
                      }}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={clearSel} disabled={!selected || locked.has(selected ?? '')} style={ctrlBtn}>⌫ clear</button>
                  <button onClick={takeHint} style={ctrlBtn}>hint{hints > 0 ? ` · ${hints}` : ''}</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', marginLeft: 'auto' }}>
                    {isTouch ? 'tap a slot, then a letter' : 'click a slot, then type'}
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </SandboxModal>
  )
}

function WinCard({ reveal, mode, streak, hints, copied, onShare, countdown, onNext }: {
  reveal: Reveal | null; mode: Mode; streak: StreakState | null; hints: number
  copied: boolean; onShare: () => void; countdown: string; onNext: () => void
}) {
  return (
    <div style={{ borderTop: '1px solid #d8d2c6', paddingTop: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: GOOD }}>
        cracked it{hints > 0 ? ` · ${hints} hint${hints > 1 ? 's' : ''}` : ' clean'}.
      </div>
      {reveal ? (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, color: INK, lineHeight: 1.5 }}>
            “{reveal.line}”
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b665d', marginTop: 5 }}>
            {reveal.song} — {reveal.artist}
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b665d', marginTop: 8 }}>revealing the song…</div>
      )}

      {mode === 'daily' ? (
        <>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a443a' }}>
            <span>streak <strong style={{ color: INK, fontSize: 14 }}>{streak?.streak ?? 0}</strong></span>
            <span>best <strong style={{ color: INK, fontSize: 14 }}>{streak?.best ?? 0}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <button onClick={onShare} style={{ ...ctrlBtn, background: INK, color: PAPER }}>{copied ? 'copied ✓' : 'share result'}</button>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>next in {countdown}</span>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          <button onClick={onNext} style={{ ...ctrlBtn, background: INK, color: PAPER }}>another line →</button>
        </div>
      )}
    </div>
  )
}

function Seg({ label, on, onClick, small }: { label: string; on: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)', fontSize: small ? 9 : 11, fontWeight: 700, letterSpacing: '0.02em',
        padding: small ? '3px 7px' : '5px 11px', cursor: 'pointer', borderRadius: 2,
        border: `1.5px solid ${INK}`, textTransform: small ? 'uppercase' : 'none',
        background: on ? INK : '#fff', color: on ? PAPER : INK,
      }}
    >
      {label}
    </button>
  )
}

function Status({ children, tone }: { children: React.ReactNode; tone?: 'bad' }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: tone === 'bad' ? '#b83612' : '#6b665d', padding: '18px 0' }}>
      {children}
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK,
  background: '#fff', border: `1.5px solid ${INK}`, padding: '8px 13px',
  cursor: 'pointer', borderRadius: 2,
}
