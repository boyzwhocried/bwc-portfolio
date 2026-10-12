import { describe, it, expect, vi } from 'vitest'
import { retryQuery } from './retry'

type R = { data: string | null; error: { message: string; code?: string } | null }
const ok = (d: string): R => ({ data: d, error: null })
const bad = (m: string, code?: string): R => ({ data: null, error: { message: m, code } })

describe('retryQuery', () => {
  it('returns first success without retrying', async () => {
    const run = vi.fn().mockResolvedValue(ok('x'))
    expect(await retryQuery(run, { baseMs: 0 })).toEqual(ok('x'))
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries a transient error then succeeds', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce(bad('upstream request timeout'))
      .mockResolvedValueOnce(ok('y'))
    expect(await retryQuery(run, { baseMs: 0 })).toEqual(ok('y'))
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('gives up after tries and returns the last error', async () => {
    const run = vi.fn().mockResolvedValue(bad('upstream request timeout'))
    const out = await retryQuery(run, { tries: 3, baseMs: 0 })
    expect(out.error?.message).toBe('upstream request timeout')
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('does not retry a not-found (PGRST116)', async () => {
    const run = vi.fn().mockResolvedValue(bad('no rows', 'PGRST116'))
    const out = await retryQuery(run, { baseMs: 0 })
    expect(out.error?.code).toBe('PGRST116')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('retries a thrown fetch failure as transient', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(ok('z'))
    expect(await retryQuery(run, { baseMs: 0 })).toEqual(ok('z'))
  })
})
