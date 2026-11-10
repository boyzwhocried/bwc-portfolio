import { describe, it, expect } from 'vitest'
import { createSession, HASH_EVERY, TIMEOUT_MS } from './session'
import { DELAY } from './lockstep'

// two sessions wired back to back, instantly
function pair() {
  const sent: unknown[][] = [[], []]
  const a = createSession(0, (m) => sent[0].push(m))
  const b = createSession(1, (m) => sent[1].push(m))
  const flush = (now: number) => {
    for (const m of sent[0].splice(0)) b.receive(m, now)
    for (const m of sent[1].splice(0)) a.receive(m, now)
  }
  return { a, b, flush }
}

describe('session', () => {
  it('runs both sides forward in step', () => {
    const { a, b, flush } = pair()
    let ia: unknown = null
    let ib: unknown = null
    for (let i = 0; i < 20; i++) {
      a.sample(1)
      b.sample(2)
      flush(i)
      ia = a.advance(i)
      ib = b.advance(i)
    }
    expect(ia).not.toBeNull()
    expect(ib).not.toBeNull()
    expect(a.frame).toBe(b.frame)
    expect(a.frame).toBeGreaterThan(DELAY)
  })

  it('times out when the opponent goes silent', () => {
    const { a } = pair()
    a.sample(0)
    for (let i = 0; i < DELAY; i++) a.advance(i)
    expect(a.status).toBe('playing')
    a.advance(TIMEOUT_MS + 10)
    expect(a.status).toBe('timeout')
  })

  it('does not time out while packets keep arriving', () => {
    const { a, b, flush } = pair()
    for (let i = 0; i < 40; i++) {
      a.sample(0)
      b.sample(0)
      flush(i * 100)
      a.advance(i * 100)
      b.advance(i * 100)
    }
    expect(a.status).toBe('playing')
  })

  it('ends when the opponent says bye', () => {
    const { a, b, flush } = pair()
    b.leave()
    flush(0)
    expect(a.status).toBe('left')
  })

  it('flags a desync when checkpoint hashes differ at the same frame', () => {
    const { a, b, flush } = pair()
    a.checkpoint(HASH_EVERY, 111)
    b.checkpoint(HASH_EVERY, 222)
    flush(0)
    expect(a.status).toBe('desync')
    expect(b.status).toBe('desync')
  })

  it('stays happy when checkpoint hashes match, whichever arrives first', () => {
    const { a, b, flush } = pair()
    a.checkpoint(HASH_EVERY, 777)
    flush(0)
    b.checkpoint(HASH_EVERY, 777)
    flush(1)
    expect(a.status).toBe('playing')
    expect(b.status).toBe('playing')
  })

  it('only sends a checkpoint on multiples of HASH_EVERY', () => {
    const sent: unknown[] = []
    const s = createSession(0, (m) => sent.push(m))
    s.checkpoint(HASH_EVERY + 1, 5)
    expect(sent).toHaveLength(0)
  })

  it('ignores malformed messages without changing state', () => {
    const { a } = pair()
    a.receive({ t: 'weird' }, 0)
    a.receive(null, 0)
    expect(a.status).toBe('playing')
  })

  it('stops advancing once it is not playing', () => {
    const { a, b, flush } = pair()
    b.leave()
    flush(0)
    a.sample(0)
    expect(a.advance(1)).toBeNull()
  })
})
