import { describe, it, expect } from 'vitest'
import { BTN } from './types'
import { keysToInput, dpadDirs, touchReduce, touchToInput, layoutFor, EMPTY_TOUCH, TOUCH_BUTTONS } from './input'

describe('keysToInput', () => {
  it('maps keys to the right bits', () => {
    expect(keysToInput(new Set(['KeyD']))).toBe(BTN.RIGHT)
    expect(keysToInput(new Set(['ArrowLeft']))).toBe(BTN.LEFT)
    expect(keysToInput(new Set(['KeyW']))).toBe(BTN.UP)
    expect(keysToInput(new Set(['KeyS']))).toBe(BTN.DOWN)
    expect(keysToInput(new Set(['KeyJ']))).toBe(BTN.PUNCH)
    expect(keysToInput(new Set(['KeyK']))).toBe(BTN.KICK)
    expect(keysToInput(new Set(['KeyL']))).toBe(BTN.SPECIAL)
    expect(keysToInput(new Set(['Space']))).toBe(BTN.BLOCK)
    expect(keysToInput(new Set(['KeyD', 'KeyJ']))).toBe(BTN.RIGHT | BTN.PUNCH)
  })

  it('ignores unknown keys', () => {
    expect(keysToInput(new Set(['KeyQ', 'F5', 'Enter']))).toBe(0)
  })
})

describe('dpadDirs', () => {
  it('is neutral inside the dead zone', () => {
    expect(dpadDirs(5, -5)).toBe(0)
  })
  it('maps a drag vector to direction bits (screen y grows downward)', () => {
    expect(dpadDirs(30, 0)).toBe(BTN.RIGHT)
    expect(dpadDirs(-30, 0)).toBe(BTN.LEFT)
    expect(dpadDirs(0, -30)).toBe(BTN.UP)
    expect(dpadDirs(0, 30)).toBe(BTN.DOWN)
    expect(dpadDirs(-30, -30)).toBe(BTN.LEFT | BTN.UP)
  })
  it('ignores a small off-axis component so a sideways drag does not jump', () => {
    expect(dpadDirs(40, -6)).toBe(BTN.RIGHT)
  })
})

describe('touch state', () => {
  it('two simultaneous touches (dpad plus a button) both register', () => {
    let s = touchReduce(EMPTY_TOUCH, { type: 'set', id: 1, bits: BTN.RIGHT })
    s = touchReduce(s, { type: 'set', id: 2, bits: BTN.PUNCH })
    expect(touchToInput(s)).toBe(BTN.RIGHT | BTN.PUNCH)
  })

  it('moving a pointer replaces its own bits only', () => {
    let s = touchReduce(EMPTY_TOUCH, { type: 'set', id: 1, bits: BTN.RIGHT })
    s = touchReduce(s, { type: 'set', id: 2, bits: BTN.KICK })
    s = touchReduce(s, { type: 'set', id: 1, bits: BTN.LEFT })
    expect(touchToInput(s)).toBe(BTN.LEFT | BTN.KICK)
  })

  it('end (pointerup or touchcancel) clears only that pointer', () => {
    let s = touchReduce(EMPTY_TOUCH, { type: 'set', id: 1, bits: BTN.RIGHT })
    s = touchReduce(s, { type: 'set', id: 2, bits: BTN.PUNCH })
    s = touchReduce(s, { type: 'end', id: 2 })
    expect(touchToInput(s)).toBe(BTN.RIGHT)
  })

  it('clear drops every held input (orientation change, blur, hidden tab)', () => {
    let s = touchReduce(EMPTY_TOUCH, { type: 'set', id: 1, bits: BTN.RIGHT })
    s = touchReduce(s, { type: 'set', id: 2, bits: BTN.PUNCH })
    expect(touchToInput(touchReduce(s, { type: 'clear' }))).toBe(0)
  })

  it('reducer does not mutate the previous state', () => {
    const before = touchReduce(EMPTY_TOUCH, { type: 'set', id: 1, bits: BTN.RIGHT })
    const snap = JSON.stringify(before)
    touchReduce(before, { type: 'set', id: 3, bits: BTN.KICK })
    expect(JSON.stringify(before)).toBe(snap)
  })
})

describe('layoutFor', () => {
  it('left-handed swaps sides without changing the bit mapping', () => {
    expect(layoutFor('right')).toEqual({ dpadSide: 'left', buttonSide: 'right' })
    expect(layoutFor('left')).toEqual({ dpadSide: 'right', buttonSide: 'left' })
    expect(TOUCH_BUTTONS.map((b) => b.bits)).toEqual([BTN.PUNCH, BTN.KICK, BTN.SPECIAL, BTN.BLOCK])
  })
})
