import { describe, it, expect } from 'vitest'
import { ROOM_ALPHABET, ROOM_LEN, makeRoomCode, normalizeRoomCode, channelName } from './room'
import { parseMessage, inputMessage, type Msg } from './protocol'

describe('room codes', () => {
  it('makes codes of the right length from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const c = makeRoomCode()
      expect(c).toHaveLength(ROOM_LEN)
      for (const ch of c) expect(ROOM_ALPHABET).toContain(ch)
    }
  })
  it('alphabet leaves out look-alikes', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) expect(ROOM_ALPHABET).not.toContain(bad)
  })
  it('is driven by the injected random source', () => {
    expect(makeRoomCode(() => 0)).toBe(ROOM_ALPHABET[0].repeat(ROOM_LEN))
  })
  it('normalizes what a person types: case, spaces and dashes', () => {
    const c = makeRoomCode()
    expect(normalizeRoomCode(' ' + c.toLowerCase().slice(0, 2) + '-' + c.slice(2) + ' ')).toBe(c)
  })
  it('rejects wrong length and forbidden characters', () => {
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('ABCD0')).toBeNull()
    expect(normalizeRoomCode('ABCDEFG')).toBeNull()
    expect(normalizeRoomCode('')).toBeNull()
  })
  it('builds a namespaced channel name', () => {
    expect(channelName('ABCDE')).toBe('fighter:room:ABCDE')
  })
})

describe('protocol', () => {
  it('round-trips an input message', () => {
    const packet = { frame: 9, bits: 17, history: [{ frame: 8, bits: 1 }] }
    expect(parseMessage(JSON.parse(JSON.stringify(inputMessage(packet))))).toEqual({ t: 'in', packet })
  })
  it('accepts start, hash and bye', () => {
    const ok: Msg[] = [
      { t: 'start', seed: 12345 },
      { t: 'hash', frame: 60, h: 99 },
      { t: 'bye' },
    ]
    for (const m of ok) expect(parseMessage(m)).toEqual(m)
  })
  it('rejects junk, wrong types and unknown kinds', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { t: 'nope' }, { t: 'start', seed: 'a' }, { t: 'hash', frame: 1.5, h: 1 }, { t: 'in', frame: -1, bits: 1, h: [] }]) {
      expect(parseMessage(bad)).toBeNull()
    }
  })
  it('caps history length and drops bad history entries', () => {
    const big = { t: 'in', frame: 50, bits: 1, h: Array.from({ length: 500 }, (_, i) => [i, 1]) }
    const m = parseMessage(big)
    expect(m && m.t === 'in' && m.packet.history.length).toBeLessThanOrEqual(8)
    const mixed = parseMessage({ t: 'in', frame: 50, bits: 1, h: [[49, 2], ['x', 1], [48]] })
    expect(mixed && mixed.t === 'in' && mixed.packet.history).toEqual([{ frame: 49, bits: 2 }])
  })
  it('rejects a seed outside a positive 31-bit integer', () => {
    const m = parseMessage({ t: 'start', seed: 2 ** 40 })
    expect(m).toBeNull()
  })
})
