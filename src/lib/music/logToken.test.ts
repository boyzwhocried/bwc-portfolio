import { describe, it, expect } from 'vitest'
import { logToken, isValidLogAuth } from './logToken'

describe('logToken', () => {
  it('is a stable 64-char hex digest that does not contain the key', () => {
    const t = logToken('service-key-123')
    expect(t).toMatch(/^[0-9a-f]{64}$/)
    expect(t).toBe(logToken('service-key-123'))
    expect(t).not.toContain('service-key-123')
  })

  it('differs per key', () => {
    expect(logToken('a')).not.toBe(logToken('b'))
  })
})

describe('isValidLogAuth', () => {
  const key = 'service-key-123'
  it('accepts the matching bearer', () => {
    expect(isValidLogAuth(`Bearer ${logToken(key)}`, key)).toBe(true)
  })
  it('rejects wrong, missing, or keyless', () => {
    expect(isValidLogAuth('Bearer nope', key)).toBe(false)
    expect(isValidLogAuth('', key)).toBe(false)
    expect(isValidLogAuth(`Bearer ${logToken(key)}`, undefined)).toBe(false)
    expect(isValidLogAuth(key, key)).toBe(false)
  })
})
