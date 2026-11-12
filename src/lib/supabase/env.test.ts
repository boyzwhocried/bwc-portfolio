import { describe, it, expect } from 'vitest'
import { cleanEnv } from './env'

describe('cleanEnv', () => {
  it('strips a trailing newline or carriage return', () => {
    expect(cleanEnv('abc\n')).toBe('abc')
    expect(cleanEnv('abc\r\n')).toBe('abc')
  })
  it('strips a leading BOM and spaces', () => {
    expect(cleanEnv('﻿ abc ')).toBe('abc')
  })
  it('leaves a clean value untouched', () => {
    expect(cleanEnv('abc.def-ghi_jkl')).toBe('abc.def-ghi_jkl')
  })
  it('turns undefined into an empty string', () => {
    expect(cleanEnv(undefined)).toBe('')
  })
})
