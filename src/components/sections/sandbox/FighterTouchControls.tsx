'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { EMPTY_TOUCH, TOUCH_BUTTONS, dpadDirs, layoutFor, touchReduce, touchToInput, type Hand } from '@/lib/sandbox/fighter/input'

const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'
const BTN_SIZE = 84

// Floating d-pad on one side, four 84px action buttons on the other, for landscape phones.
// Every pointer is tracked by id, so a d-pad thumb and a button thumb work together, and a
// cancelled or lost pointer always releases its inputs.
export default function FighterTouchControls({ hand, onChange }: { hand: Hand; onChange: (bits: number) => void }) {
  const [state, dispatch] = useReducer(touchReduce, EMPTY_TOUCH)
  const anchors = useRef(new Map<number, { x: number; y: number }>())
  const [knob, setKnob] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const { dpadSide, buttonSide } = layoutFor(hand)

  useEffect(() => {
    onChange(touchToInput(state))
  }, [state, onChange])

  // anything that could strand a held input releases everything
  useEffect(() => {
    const clear = () => {
      anchors.current.clear()
      setKnob(null)
      dispatch({ type: 'clear' })
    }
    const onVis = () => {
      if (document.hidden) clear()
    }
    window.addEventListener('blur', clear)
    window.addEventListener('orientationchange', clear)
    window.addEventListener('resize', clear)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', clear)
      window.removeEventListener('orientationchange', clear)
      window.removeEventListener('resize', clear)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const endPointer = (id: number) => {
    anchors.current.delete(id)
    setKnob(null)
    dispatch({ type: 'end', id })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div
        ref={zoneRef}
        role="group"
        aria-label="Move: drag left or right to walk, up to jump"
        style={{ position: 'absolute', bottom: 0, [dpadSide]: 0, width: '42%', height: '62%', pointerEvents: 'auto', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          anchors.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          const r = e.currentTarget.getBoundingClientRect()
          setKnob({ x: e.clientX - r.left, y: e.clientY - r.top, dx: 0, dy: 0 })
          dispatch({ type: 'set', id: e.pointerId, bits: 0 })
        }}
        onPointerMove={(e) => {
          const a = anchors.current.get(e.pointerId)
          if (!a) return
          const dx = e.clientX - a.x
          const dy = e.clientY - a.y
          const r = e.currentTarget.getBoundingClientRect()
          setKnob({ x: a.x - r.left, y: a.y - r.top, dx: Math.max(-36, Math.min(36, dx)), dy: Math.max(-36, Math.min(36, dy)) })
          dispatch({ type: 'set', id: e.pointerId, bits: dpadDirs(dx, dy) })
        }}
        onPointerUp={(e) => endPointer(e.pointerId)}
        onPointerCancel={(e) => endPointer(e.pointerId)}
        onLostPointerCapture={(e) => endPointer(e.pointerId)}
      >
        {knob && (
          <>
            <div style={{ position: 'absolute', left: knob.x - 44, top: knob.y - 44, width: 88, height: 88, borderRadius: '50%', border: `2px solid ${PAPER}`, opacity: 0.5 }} />
            <div style={{ position: 'absolute', left: knob.x + knob.dx - 20, top: knob.y + knob.dy - 20, width: 40, height: 40, borderRadius: '50%', background: PAPER, opacity: 0.75 }} />
          </>
        )}
      </div>

      <div
        style={{
          position: 'absolute', bottom: 12, [buttonSide]: 12, display: 'grid',
          gridTemplateColumns: `repeat(2, ${BTN_SIZE}px)`, gap: 10, pointerEvents: 'none',
        }}
      >
        {TOUCH_BUTTONS.map((b) => {
          const down = (touchToInput(state) & b.bits) !== 0
          return (
            <button
              key={b.label}
              type="button"
              aria-label={b.label}
              style={{
                width: BTN_SIZE, height: BTN_SIZE, borderRadius: '50%', pointerEvents: 'auto', touchAction: 'none',
                border: `3px solid ${PAPER}`, background: down ? VERM : INK, color: PAPER,
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, opacity: 0.85,
              }}
              onPointerDown={(e) => {
                e.preventDefault()
                e.currentTarget.setPointerCapture(e.pointerId)
                dispatch({ type: 'set', id: e.pointerId, bits: b.bits })
              }}
              onPointerUp={(e) => endPointer(e.pointerId)}
              onPointerCancel={(e) => endPointer(e.pointerId)}
              onLostPointerCapture={(e) => endPointer(e.pointerId)}
              onContextMenu={(e) => e.preventDefault()}
            >
              {b.label.toUpperCase()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
