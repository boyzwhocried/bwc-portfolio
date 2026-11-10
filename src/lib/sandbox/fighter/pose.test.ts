import { describe, it, expect } from 'vitest'
import { poseFor } from './pose'
import { initMatch } from './sim'
import { TEST_DEF, TEST_PUNCH } from './test-fixtures'
import type { FighterState } from './types'

const base = (): FighterState => initMatch(1, [TEST_DEF, TEST_DEF]).fighters[0]
const p = (f: Partial<FighterState>, frame = 0, koAge = 0) => poseFor({ ...base(), ...f }, TEST_DEF, frame, koAge)

describe('poseFor', () => {
  it('idle alternates between two frames', () => {
    expect(p({}, 0)).toEqual({ anim: 'idle', index: 0, smear: false })
    expect(p({}, 32).index).toBe(1)
  })

  it('walk cycles through four frames', () => {
    const seen = new Set([0, 8, 16, 24].map((fr) => p({ action: 'walk' }, fr).index))
    expect(seen.size).toBe(4)
  })

  it('attack picks windup, strike (with smear), recovery by phase', () => {
    const at = (actionFrame: number) => p({ action: 'attack', move: 'punch', actionFrame })
    expect(at(0)).toEqual({ anim: 'punch', index: 0, smear: false })
    expect(at(TEST_PUNCH.startup)).toEqual({ anim: 'punch', index: 1, smear: true })
    expect(at(TEST_PUNCH.startup + TEST_PUNCH.active)).toEqual({ anim: 'punch', index: 2, smear: false })
  })

  it('hitstun, block, blockstun and jump map to their animations', () => {
    expect(p({ action: 'hitstun' }).anim).toBe('hit')
    expect(p({ action: 'block' }).anim).toBe('block')
    expect(p({ action: 'blockstun' }).anim).toBe('block')
    expect(p({ action: 'jump', y: 500 }).anim).toBe('jump')
  })

  it('ko falls first then lies flat', () => {
    expect(p({ action: 'ko' }, 0, 0)).toEqual({ anim: 'ko', index: 0, smear: false })
    expect(p({ action: 'ko' }, 0, 30).index).toBe(1)
  })
})
