'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import {
  SIZE, emptyBoard, canPlace, place, clearLines, scoreClear, anyMoveAvailable,
  makeTray, type Board, type Piece, type Shape, type Ink,
} from '@/lib/sandbox/press'

const STORAGE_KEY = 'bwc-press-v1'
const PAPER = '#efe9dd'
const INK = '#1a1a1a'
const VERM = '#e84c28'
const GRID = 'rgba(26,26,26,0.10)'

const inkColor = (ink: Ink) => (ink === 1 ? INK : VERM)

type Saved = { pb: number; history: number[] }
function load(): Saved {
  if (typeof window === 'undefined') return { pb: 0, history: [] }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '') as Saved } catch { return { pb: 0, history: [] } }
}

// the pressed-sort look: a beveled ink tile with a paper-side highlight
function sortStyle(color: string): React.CSSProperties {
  return {
    background: color,
    boxShadow: 'inset 1.5px 1.5px 0 rgba(255,255,255,0.14), inset -1.5px -1.5px 0 rgba(0,0,0,0.28)',
    borderRadius: 2,
  }
}

export default function ThePress({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<Board>(() => emptyBoard())
  const [tray, setTray] = useState<(Piece | null)[]>([null, null, null])
  const [sel, setSel] = useState<number | null>(null)
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(() => new Set())
  const [toast, setToast] = useState('')
  // lazy init: this modal only mounts client-side (on toy click), so localStorage is safe
  const [saved, setSaved] = useState<Saved>(() => load())
  const boardRef = useRef<HTMLDivElement>(null)
  // drag state: a floating avatar follows the pointer while a sort is dragged
  const [dragXY, setDragXY] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const movedRef = useRef(false)
  const wasSelRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // fill the first tray AFTER mount: Math.random in a deferred callback keeps it
  // out of render (this repo's react-hooks/purity rule bans random during render)
  useEffect(() => {
    const id = setTimeout(() => setTray(makeTray(Math.random)), 0)
    return () => clearTimeout(id)
  }, [])

  // persist PB + history
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch {}
  }, [saved])

  const bestNow = Math.max(saved.pb, score)
  const selPiece = sel !== null ? tray[sel] : null

  function cellFromEvent(e: { clientX: number; clientY: number }): { r: number; c: number } | null {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const unit = rect.width / SIZE
    const c = Math.floor((e.clientX - rect.left) / unit)
    const r = Math.floor((e.clientY - rect.top) / unit)
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null
    return { r, c }
  }

  // centre the sort on the pointed cell, then clamp so it stays in the forme
  function anchorFor(cell: { r: number; c: number }, shape: Shape) {
    let r = cell.r - Math.floor((shape.h - 1) / 2)
    let c = cell.c - Math.floor((shape.w - 1) / 2)
    r = Math.max(0, Math.min(SIZE - shape.h, r))
    c = Math.max(0, Math.min(SIZE - shape.w, c))
    return { r, c }
  }

  function clearedKeys(b: Board): Set<string> {
    const keys = new Set<string>()
    for (let r = 0; r < SIZE; r++) if (b[r].every((x) => x !== 0)) for (let c = 0; c < SIZE; c++) keys.add(`${r},${c}`)
    for (let c = 0; c < SIZE; c++) {
      let full = true
      for (let r = 0; r < SIZE; r++) if (b[r][c] === 0) { full = false; break }
      if (full) for (let r = 0; r < SIZE; r++) keys.add(`${r},${c}`)
    }
    return keys
  }

  function commit(anchor: { r: number; c: number }) {
    if (sel === null || over) return
    const piece = tray[sel]
    if (!piece) return
    if (!canPlace(board, piece.shape, anchor.r, anchor.c)) return // invalid drop, ignore

    const placed = place(board, piece.shape, anchor.r, anchor.c, piece.ink)
    const keys = clearedKeys(placed)
    const res = clearLines(placed)

    let gained = piece.shape.cells.length // a point per sort cell set
    let nextCombo = combo
    if (res.lines > 0) {
      gained += scoreClear(res.lines, res.mono, combo)
      nextCombo = combo + 1
      const bits: string[] = [`${res.lines} line${res.lines > 1 ? 's' : ''}`]
      if (res.mono > 0) bits.push(`${res.mono} clean pull${res.mono > 1 ? 's' : ''}`)
      if (nextCombo > 1) bits.push(`edition x${nextCombo}`)
      setToast(bits.join(' · '))
      setFlash(keys)
      window.setTimeout(() => setFlash(new Set()), 280)
      window.setTimeout(() => setToast(''), 1300)
    } else {
      nextCombo = 0
    }

    const finalScore = score + gained
    const nextTray = tray.slice()
    nextTray[sel] = null
    const refilled = nextTray.every((p) => p === null) ? makeTray(Math.random) : nextTray

    setBoard(res.board)
    setScore(finalScore)
    setCombo(nextCombo)
    setTray(refilled)
    setSel(null)
    setHover(null)

    const remaining = refilled.filter((p): p is Piece => p !== null)
    if (!anyMoveAvailable(res.board, remaining)) {
      const pb = Math.max(saved.pb, finalScore)
      const history = [...saved.history, finalScore].slice(-10)
      setSaved({ pb, history })
      setOver(true)
    }
  }

  function onBoardMove(e: React.PointerEvent) {
    if (sel === null || over) return
    const piece = tray[sel]
    if (!piece) return
    const cell = cellFromEvent(e)
    setHover(cell ? anchorFor(cell, piece.shape) : null)
  }

  function onBoardClick(e: React.MouseEvent) {
    if (sel === null || over) return
    const piece = tray[sel]
    if (!piece) return
    const cell = cellFromEvent(e)
    if (!cell) return
    commit(anchorFor(cell, piece.shape))
  }

  // ---- drag a sort: pick up from the tray, drop onto the forme ----
  function onSortPointerDown(e: React.PointerEvent, i: number) {
    const piece = tray[i]
    if (!piece || over) return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    movedRef.current = false
    wasSelRef.current = sel === i
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    setSel(i)
    setDragXY({ x: e.clientX, y: e.clientY })
    const cell = cellFromEvent(e)
    setHover(cell ? anchorFor(cell, piece.shape) : null)
  }

  function onSortPointerMove(e: React.PointerEvent, i: number) {
    if (!draggingRef.current) return
    const piece = tray[i]
    if (!piece) return
    const s = dragStartRef.current
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) movedRef.current = true
    setDragXY({ x: e.clientX, y: e.clientY })
    const cell = cellFromEvent(e)
    setHover(cell ? anchorFor(cell, piece.shape) : null)
  }

  function onSortPointerUp(e: React.PointerEvent, i: number) {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragXY(null)
    const piece = tray[i]
    if (!piece) return
    const cell = cellFromEvent(e)
    const anchor = cell ? anchorFor(cell, piece.shape) : null
    if (movedRef.current) {
      // a real drag: drop on a valid cell, otherwise the held sort goes back
      if (anchor && canPlace(board, piece.shape, anchor.r, anchor.c)) commit(anchor)
      else { setSel(null); setHover(null) }
    } else if (wasSelRef.current) {
      // a tap on the already-held sort puts it down (tap-then-tap-forme path)
      setSel(null); setHover(null)
    }
    // a tap on an unheld sort just leaves it selected (set on pointer-down)
  }

  function restart() {
    setBoard(emptyBoard())
    setTray(makeTray(Math.random))
    setSel(null)
    setHover(null)
    setScore(0)
    setCombo(0)
    setToast('')
    setFlash(new Set())
    setOver(false)
  }

  // ghost footprint of the held sort over the hovered anchor
  const ghost = new Set<string>()
  let ghostValid = false
  if (selPiece && hover) {
    ghostValid = canPlace(board, selPiece.shape, hover.r, hover.c)
    for (const [dr, dc] of selPiece.shape.cells) ghost.add(`${hover.r + dr},${hover.c + dc}`)
  }

  return (
    <SandboxModal
      title="the press"
      onClose={onClose}
      width={360}
      panelBg={PAPER}
      panelFg={INK}
      borderColor={INK}
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>PB {saved.pb}</span>}
    >
      <div style={{ padding: '14px 16px 18px' }}>
        {/* readout */}
        <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d', letterSpacing: '0.1em' }}>SCORE</span>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30, lineHeight: 1, color: INK }}>{score}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b665d' }}>best {bestNow}</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: combo > 1 ? VERM : '#9a9384', minHeight: 15 }}>
              {combo > 1 ? `edition x${combo}` : 'set & print'}
            </div>
          </div>
        </div>

        {/* toast */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: VERM, minHeight: 16, marginBottom: 6, textAlign: 'center' }}>{toast}</div>

        {/* forme */}
        <div
          ref={boardRef}
          onPointerMove={onBoardMove}
          onPointerLeave={() => setHover(null)}
          onClick={onBoardClick}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
            width: '100%',
            maxWidth: 320,
            margin: '0 auto',
            aspectRatio: '1 / 1',
            border: `1.5px solid ${INK}`,
            background: PAPER,
            cursor: sel !== null ? 'crosshair' : 'default',
            touchAction: 'manipulation',
          }}
        >
          {Array.from({ length: SIZE * SIZE }).map((_, i) => {
            const r = Math.floor(i / SIZE)
            const c = i % SIZE
            const key = `${r},${c}`
            const v = board[r][c]
            const isFlash = flash.has(key)
            const isGhost = ghost.has(key)
            let bg = 'transparent'
            let inner: React.CSSProperties = {}
            if (isFlash) {
              bg = '#cfc7b8' // freshly printed impression on the paper
            } else if (v !== 0) {
              inner = sortStyle(inkColor(v))
            } else if (isGhost) {
              bg = ghostValid ? (selPiece!.ink === 1 ? 'rgba(26,26,26,0.22)' : 'rgba(232,76,40,0.28)') : 'rgba(184,54,18,0.16)'
            }
            return (
              <div
                key={i}
                style={{
                  borderRight: c < SIZE - 1 ? `1px solid ${GRID}` : undefined,
                  borderBottom: r < SIZE - 1 ? `1px solid ${GRID}` : undefined,
                  position: 'relative',
                  background: bg,
                }}
              >
                {v !== 0 && !isFlash && <div style={{ position: 'absolute', inset: 1.5, ...inner }} />}
                {isGhost && ghostValid && !isFlash && v === 0 && (
                  <div style={{ position: 'absolute', inset: 3, border: `1px dashed ${selPiece!.ink === 1 ? INK : VERM}`, borderRadius: 2 }} />
                )}
              </div>
            )
          })}
        </div>

        {/* tray of sorts */}
        <div className="flex items-end justify-center" style={{ gap: 14, marginTop: 16, minHeight: 64 }}>
          {tray.map((p, i) => {
            const isSel = sel === i
            return (
              <button
                key={i}
                onPointerDown={(e) => onSortPointerDown(e, i)}
                onPointerMove={(e) => onSortPointerMove(e, i)}
                onPointerUp={(e) => onSortPointerUp(e, i)}
                onPointerCancel={() => { draggingRef.current = false; setDragXY(null) }}
                aria-label={p ? `sort ${i + 1}` : `empty slot ${i + 1}`}
                disabled={!p || over}
                style={{
                  border: 'none', padding: 6, touchAction: 'none',
                  cursor: p && !over ? (isSel && dragXY ? 'grabbing' : 'grab') : 'default',
                  outline: isSel ? `1.5px solid ${INK}` : '1.5px solid transparent',
                  boxShadow: isSel ? `2px 2px 0 ${INK}` : 'none',
                  background: isSel ? 'rgba(26,26,26,0.05)' : 'none',
                  opacity: isSel && dragXY ? 0.35 : 1,
                  transform: isSel ? 'translateY(-2px)' : 'none',
                  transition: 'transform 120ms ease, opacity 120ms ease',
                }}
              >
                {p ? <PieceMini piece={p} /> : <div style={{ width: 36, height: 36, border: `1px dashed ${GRID}` }} />}
              </button>
            )
          })}
        </div>

        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 12, color: '#6b665d', lineHeight: 1.5, marginTop: 12, textAlign: 'center' }}>
          drag a sort onto the forme to set it (or tap to pick up, then tap a cell).
          fill a row or column to print it. a single-ink line is a <strong style={{ color: VERM }}>clean pull</strong>.
        </p>

        {/* floating sort that tracks the pointer while dragging */}
        {dragXY && selPiece && (
          <div
            aria-hidden
            style={{
              position: 'fixed', left: dragXY.x, top: dragXY.y,
              transform: 'translate(-50%, -135%)', pointerEvents: 'none', zIndex: 400,
              opacity: 0.95, filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.28))',
            }}
          >
            <PieceMini piece={selPiece} />
          </div>
        )}

        {/* game over */}
        {over && (
          <div style={{ marginTop: 14, borderTop: `1px solid #d8d2c6`, paddingTop: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: INK }}>out of room.</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a443a', marginTop: 4 }}>
              score <strong style={{ fontSize: 14 }}>{score}</strong> · best <strong style={{ fontSize: 14 }}>{saved.pb}</strong>
            </div>
            {saved.history.length > 1 && (
              <svg width="200" height="38" style={{ margin: '10px auto 0', display: 'block' }} aria-hidden>
                {saved.history.map((h, i) => {
                  const max = Math.max(...saved.history, 1)
                  const x = (i / (saved.history.length - 1)) * 196 + 2
                  const y = 36 - (h / max) * 32
                  if (i === 0) return <circle key={i} cx={x} cy={y} r={1.6} fill={INK} />
                  const px = ((i - 1) / (saved.history.length - 1)) * 196 + 2
                  const py = 36 - (saved.history[i - 1] / max) * 32
                  return <g key={i}><line x1={px} y1={py} x2={x} y2={y} stroke={INK} strokeWidth={1} opacity={0.8} /><circle cx={x} cy={y} r={1.6} fill={INK} /></g>
                })}
              </svg>
            )}
            <button onClick={restart} style={{ ...ctrlBtn, marginTop: 12, background: INK, color: PAPER }}>set again</button>
          </div>
        )}
      </div>
    </SandboxModal>
  )
}

// a sort shown at tray scale: its bounding box, filled cells in the sort's ink
function PieceMini({ piece }: { piece: Piece }) {
  const { shape, ink } = piece
  const filled = new Set(shape.cells.map(([r, c]) => `${r},${c}`))
  const unit = 12
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shape.w}, ${unit}px)`, gap: 2 }}>
      {Array.from({ length: shape.w * shape.h }).map((_, i) => {
        const r = Math.floor(i / shape.w)
        const c = i % shape.w
        const on = filled.has(`${r},${c}`)
        return <div key={i} style={{ width: unit, height: unit, ...(on ? sortStyle(inkColor(ink)) : { background: 'transparent' }) }} />
      })}
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK,
  background: '#fff', border: `1.5px solid ${INK}`, padding: '8px 18px',
  cursor: 'pointer', borderRadius: 2,
}
