import { describe, it, expect } from 'vitest'
import { createSession, HASH_EVERY, TIMEOUT_MS, SEND_EVERY, RESEND_MS, statusLine } from './session'
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

  it('sends one packet per SEND_EVERY samples, not one per frame', () => {
    const sent: unknown[] = []
    const s = createSession(0, (m) => sent.push(m))
    for (let i = 0; i < SEND_EVERY * 4; i++) s.sample(1)
    expect(sent).toHaveLength(4)
  })

  it('throttles stall resends to one per RESEND_MS', () => {
    const sent: unknown[] = []
    const s = createSession(0, (m) => sent.push(m))
    s.sample(0)
    for (let i = 0; i < DELAY; i++) s.advance(0)
    sent.length = 0
    for (let t = 0; t < RESEND_MS; t += 5) s.advance(t) // stalled the whole time
    expect(sent.length).toBeLessThanOrEqual(1)
    s.advance(RESEND_MS * 3)
    expect(sent.length).toBeGreaterThanOrEqual(1)
  })

  it('stays in step with batching when packets arrive late but within the delay', () => {
    const { a, b, flush } = pair()
    for (let i = 0; i < 300; i++) {
      a.sample(i & 15)
      b.sample(i & 7)
      flush(i * 16)
      a.advance(i * 16)
      b.advance(i * 16)
    }
    expect(a.status).toBe('playing')
    expect(Math.abs(a.frame - b.frame)).toBeLessThanOrEqual(DELAY)
    expect(a.frame).toBeGreaterThan(200)
  })
})

describe('statusLine', () => {
  it('gives each ending a plain English line with no translation and no em-dash', () => {
    for (const st of ['left', 'timeout', 'desync'] as const) {
      const l = statusLine(st)
      expect(l.length).toBeGreaterThan(10)
      expect(l).not.toContain(' / ')
      expect(l).not.toMatch(/lawan|koneksi|kamu|sinkron|menang/i)
      expect(l).not.toContain(String.fromCharCode(0x2014))
    }
  })
  it('tells the staying player they win when the opponent leaves', () => {
    expect(statusLine('left')).toMatch(/win/i)
  })
  it('is empty while playing', () => {
    expect(statusLine('playing')).toBe('')
  })
})
