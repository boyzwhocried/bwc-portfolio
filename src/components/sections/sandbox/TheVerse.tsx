'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import useIsTouch from '@/lib/useIsTouch'
import { dayIndex, updateStreak, type StreakState } from '@/lib/sandbox/daily'
import { decode, isSolved, letterFrequencies, buildVerseShare, ALPHA, MAX_HINTS, HINT_LADDER } from '@/lib/sandbox/cipher'
import {
  dailyVerse, randomVerse, revealVerse, giveUpVerse, hintVerse, checkVerse,
  type Puzzle, type Difficulty,
} from '@/actions/verse'

const STORAGE_KEY = 'bwc-verse-v1'
const PAPER = '#efe9dd'
const INK = '#1a1a1a'
const ACCENT = '#e84c28'
const GOOD = '#3a7d3a'
const BAD = '#b83612'
const FLASH = 'rgba(232,168,40,0.45)'
const DIM = '#9a8f80'

type Mode = 'daily' | 'free'
type Status = 'playing' | 'won' | 'revealed'
type Reveal = { song: string; artist: string; line: string }
type HintReveal = { kind: 'artist' | 'song'; text: string }
type Saved = {
  day: number
  mapping: Record<string, string>
  status: Status
  hints: number
  hintLocked: string[]
  hintReveals: HintReveal[]
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
  const [status, setStatus] = useState<Status>('playing')
  const [reveal, setReveal] = useState<Reveal | null>(null)
  const [hints, setHints] = useState(0)
  const [hintLocked, setHintLocked] = useState<Set<string>>(new Set())
  const [hintReveals, setHintReveals] = useState<HintReveal[]>([])
  const [verdict, setVerdict] = useState<Record<string, boolean>>({})
  const [flash, setFlash] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [streak, setStreak] = useState<StreakState | null>(null)
  const [copied, setCopied] = useState(false)
  const [nowMs, setNowMs] = useState(0)

  const streakRef = useRef<StreakState | null>(null)
  streakRef.current = streak
  const finalized = useRef(false)

  // an off-screen input that raises the device's native keyboard on touch. Tapping
  // a cipher box focuses it; what the player types is routed through `assign`.
  const keyboardRef = useRef<HTMLInputElement>(null)
  const focusKeyboard = useCallback(() => {
    if (isTouch) keyboardRef.current?.focus()
  }, [isTouch])

  // starters are server-revealed, locked letters
  const starterMap = useMemo<Record<string, string>>(
    () => (puzzle ? Object.fromEntries(puzzle.starters) : {}),
    [puzzle],
  )
  // locked = server starters + letters uncovered by a hint (both correct, fixed)
  const locked = useMemo(
    () => new Set([...Object.keys(starterMap), ...hintLocked]),
    [starterMap, hintLocked],
  )
  const full = useMemo(() => ({ ...starterMap, ...userMap }), [starterMap, userMap])

  // briefly highlight a box (e.g. a letter that just moved or was refused)
  const pulse = useCallback((c: string) => {
    setFlash(c)
    window.setTimeout(() => setFlash((f) => (f === c ? null : f)), 600)
  }, [])

  const resetBoard = useCallback((p: Puzzle, carryStreak: StreakState | null) => {
    setUserMap({})
    setStatus('playing')
    setReveal(null)
    setHints(0)
    setHintLocked(new Set())
    setHintReveals([])
    setVerdict({})
    setFlash(null)
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
      setHintLocked(new Set(saved.hintLocked ?? []))
      setHintReveals(saved.hintReveals ?? [])
      setVerdict({})
      setStreak(saved.streak); setReveal(saved.reveal)
      finalized.current = saved.status !== 'playing'
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
    const s: Saved = {
      day: today, mapping: userMap, status, hints,
      hintLocked: Array.from(hintLocked), hintReveals, streak, reveal,
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }, [mode, puzzle, today, userMap, status, hints, hintLocked, hintReveals, streak, reveal])

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

  // live countdown ticker once the daily is finished (won or revealed)
  useEffect(() => {
    if (mode !== 'daily' || status === 'playing') return
    const seed = requestAnimationFrame(() => setNowMs(Date.now()))
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => { cancelAnimationFrame(seed); clearInterval(id) }
  }, [mode, status])

  // move the selection to the next/prev editable box (skips locked letters)
  const moveSel = useCallback((dir: 1 | -1) => {
    if (!puzzle) return
    const order = cipherOrder(puzzle.cipherText).filter((c) => !locked.has(c))
    if (order.length === 0) return
    const cur = selected ? order.indexOf(selected) : -1
    const ni = cur === -1 ? (dir === 1 ? 0 : order.length - 1) : (cur + dir + order.length) % order.length
    setSelected(order[ni])
  }, [puzzle, locked, selected])

  const assign = useCallback((plain: string) => {
    if (status !== 'playing' || !selected || locked.has(selected)) return
    // refuse stealing a letter already held by a locked (correct) slot
    const lockedOwner = Object.keys(starterMap).find((k) => starterMap[k] === plain)
      ?? Array.from(hintLocked).find((k) => userMap[k] === plain)
    if (lockedOwner && lockedOwner !== selected) { pulse(lockedOwner); return }

    const next = { ...userMap }
    let moved: string | null = null
    // a plain letter is used once: free it from any other (non-locked) cipher slot
    for (const k of Object.keys(next)) {
      if (next[k] === plain && k !== selected && !locked.has(k)) { delete next[k]; moved = k }
    }
    next[selected] = plain
    setUserMap(next)
    if (moved) pulse(moved)
    // the changed letters' prior verdicts are stale
    setVerdict((v) => { const n = { ...v }; delete n[selected]; if (moved) delete n[moved]; return n })

    // auto-advance to the next unassigned editable box
    const order = cipherOrder(puzzle!.cipherText)
    const from = order.indexOf(selected)
    const nextC = order.slice(from + 1).concat(order.slice(0, from)).find((c) => !locked.has(c) && !next[c] && c !== selected)
    setSelected(nextC ?? selected)
  }, [status, selected, locked, starterMap, hintLocked, userMap, puzzle, pulse])

  const clearSel = useCallback(() => {
    if (status !== 'playing' || !selected || locked.has(selected)) return
    setUserMap((prev) => { const n = { ...prev }; delete n[selected]; return n })
    setVerdict((v) => { const n = { ...v }; delete n[selected]; return n })
  }, [status, selected, locked])

  // clear every letter the player typed, but keep the board's given letters —
  // server starters and any hint-revealed (locked) letters stay put.
  const resetEntries = useCallback(() => {
    if (status !== 'playing' || !puzzle) return
    setUserMap((prev) => {
      const n: Record<string, string> = {}
      for (const k of Object.keys(prev)) if (hintLocked.has(k)) n[k] = prev[k]
      return n
    })
    setVerdict({})
    setSelected(cipherOrder(puzzle.cipherText).find((c) => !locked.has(c)) ?? null)
  }, [status, puzzle, hintLocked, locked])

  const hasEntries = useMemo(
    () => Object.keys(userMap).some((k) => !hintLocked.has(k)),
    [userMap, hintLocked],
  )

  const check = useCallback(async () => {
    if (!puzzle || status !== 'playing' || checking) return
    setChecking(true)
    const r = await checkVerse(puzzle.ref, full)
    setChecking(false)
    if (r.ok) setVerdict(r.verdict)
  }, [puzzle, status, checking, full])

  // keyboard: letters assign, backspace clears, enter checks, arrows navigate.
  // The off-screen touch input handles its own keys, so skip when it's focused
  // (else a physical-keyboard event would be handled twice).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== 'playing') return
      if (document.activeElement === keyboardRef.current) return
      const k = e.key.toLowerCase()
      if (k >= 'a' && k <= 'z' && k.length === 1) { e.preventDefault(); assign(k) }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearSel() }
      else if (e.key === 'Enter') { e.preventDefault(); check() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveSel(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSel(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [assign, clearSel, moveSel, check, status])

  async function takeHint() {
    if (!puzzle || status !== 'playing' || hints >= MAX_HINTS) return
    const r = await hintVerse(puzzle.ref, hints, Object.keys(full))
    if (!r.ok) return
    if (r.kind === 'letter') {
      const next = { ...userMap }
      let moved: string | null = null
      for (const k of Object.keys(next)) {
        if (next[k] === r.plain && k !== r.cipher && !locked.has(k)) { delete next[k]; moved = k }
      }
      next[r.cipher] = r.plain
      setUserMap(next)
      setHintLocked((s) => new Set(s).add(r.cipher))
      if (moved) pulse(moved)
      setVerdict((v) => { const n = { ...v }; n[r.cipher] = true; if (moved) delete n[moved]; return n })
    } else if (r.kind === 'artist') {
      setHintReveals((h) => [...h, { kind: 'artist', text: r.artist }])
    } else {
      setHintReveals((h) => [...h, { kind: 'song', text: r.song }])
    }
    setHints((h) => h + 1)
  }

  async function giveUp() {
    if (!puzzle || status !== 'playing') return
    const r = await giveUpVerse(puzzle.ref)
    if (mode === 'daily') setStreak(updateStreak(streakRef.current, today, false))
    finalized.current = true
    setStatus('revealed')
    setSelected(null)
    if (r.ok) setReveal(r)
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
  const finished = status !== 'playing'
  const nextHintLabel = HINT_LADDER[hints] ?? null

  function inkFor(ch: string): string {
    if (locked.has(ch)) return GOOD
    const v = verdict[ch]
    if (v === true) return GOOD
    if (v === false) return BAD
    return INK
  }

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
          a line of song lyric, enciphered. every letter is swapped for another, the same
          swap throughout. crack the code to name the song.
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
                      const isFlash = flash === ch
                      const underline = isSel ? ACCENT : verdict[ch] === false ? BAD : isLock || verdict[ch] === true ? GOOD : '#b8b0a2'
                      return (
                        <button
                          key={ci}
                          onClick={() => { if (!finished) { setSelected(ch); focusKeyboard() } }}
                          aria-label={`cipher ${ch}`}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            background: isFlash ? FLASH : isSel ? 'rgba(232,76,40,0.14)' : 'transparent',
                            border: 'none', padding: '2px 3px', minWidth: 22, borderRadius: 3,
                            cursor: status === 'playing' && !isLock ? 'pointer' : 'default',
                            transition: 'background 160ms',
                          }}
                        >
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, lineHeight: 1,
                            minWidth: 13, height: 20, color: inkFor(ch),
                          }}>
                            {plain ? plain.toUpperCase() : ''}
                          </span>
                          <span style={{ width: 15, height: 0, borderBottom: `2px solid ${underline}` }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isSel ? ACCENT : DIM }}>{ch}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* revealed hints (artist / song) */}
            {hintReveals.length > 0 && status === 'playing' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {hintReveals.map((h, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', border: '1px dashed #c9c1b2', padding: '3px 7px', borderRadius: 2 }}>
                    {h.kind}: <strong style={{ color: INK }}>{h.text}</strong>
                  </span>
                ))}
              </div>
            )}

            {finished ? (
              <ResultCard
                reveal={reveal} outcome={status === 'won' ? 'won' : 'revealed'} mode={mode}
                streak={streak} hints={hints} copied={copied} onShare={share}
                countdown={countdown()} onNext={() => loadFree(difficulty)}
              />
            ) : (
              <>
                {/* off-screen input: focusing it raises the native keyboard on touch.
                    Typed letters route to assign; backspace/enter/arrows mirror desktop. */}
                <input
                  ref={keyboardRef}
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  aria-hidden="true"
                  tabIndex={-1}
                  value=""
                  onChange={(e) => {
                    const ch = e.target.value.slice(-1).toLowerCase()
                    if (ch >= 'a' && ch <= 'z') assign(ch)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); check() }
                    else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); clearSel() }
                    else if (e.key === 'ArrowRight') { e.preventDefault(); moveSel(1) }
                    else if (e.key === 'ArrowLeft') { e.preventDefault(); moveSel(-1) }
                  }}
                  style={{ position: 'absolute', width: 1, height: 1, padding: 0, border: 0, opacity: 0, left: -9999, top: 0 }}
                />
                {/* frequency strip — the solver's aid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {freqs.map((f) => (
                    <button
                      key={f.letter}
                      onClick={() => { setSelected(f.letter); focusKeyboard() }}
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

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={check} disabled={checking} style={{ ...ctrlBtn, background: INK, color: PAPER, opacity: checking ? 0.6 : 1 }}>
                    {checking ? 'checking…' : 'check'}
                  </button>
                  <button onClick={clearSel} disabled={!selected || locked.has(selected ?? '')} style={ctrlBtn}>⌫ clear</button>
                  <button onClick={resetEntries} disabled={!hasEntries} style={{ ...ctrlBtn, opacity: hasEntries ? 1 : 0.5 }}>↺ reset</button>
                  <button onClick={takeHint} disabled={hints >= MAX_HINTS} style={{ ...ctrlBtn, opacity: hints >= MAX_HINTS ? 0.5 : 1 }}>
                    hint{hints > 0 ? ` ${hints}/${MAX_HINTS}` : ''}{nextHintLabel ? ` · ${nextHintLabel}` : ''}
                  </button>
                  <button onClick={giveUp} style={{ ...ctrlBtn, border: `1.5px solid ${BAD}`, color: BAD }}>give up</button>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', marginTop: 8 }}>
                  {isTouch ? 'tap a box, then type · enter checks' : 'click a box (or ←/→), then type · enter checks'} · reset clears your letters
                </p>
              </>
            )}
          </>
        )}
      </div>
    </SandboxModal>
  )
}

function ResultCard({ reveal, outcome, mode, streak, hints, copied, onShare, countdown, onNext }: {
  reveal: Reveal | null; outcome: 'won' | 'revealed'; mode: Mode; streak: StreakState | null; hints: number
  copied: boolean; onShare: () => void; countdown: string; onNext: () => void
}) {
  const won = outcome === 'won'
  return (
    <div style={{ borderTop: '1px solid #d8d2c6', paddingTop: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: won ? GOOD : BAD }}>
        {won ? `cracked it${hints > 0 ? ` · ${hints} hint${hints > 1 ? 's' : ''}` : ' clean'}.` : 'the answer —'}
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
