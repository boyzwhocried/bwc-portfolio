import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED = new Set(['#1a1a1a', '#ece7de', '#e84c28'])
const FILES = [
  'src/components/sections/sandbox/Fighter.tsx',
  'src/components/sections/sandbox/FighterTouchControls.tsx',
  'src/components/sections/sandbox/FighterArcadePanel.tsx',
  'src/lib/sandbox/fighter/art/sprite.ts',
]

describe('fighter palette rule', () => {
  it('uses only ink, paper and vermilion hex colors in the fighter UI', () => {
    for (const f of FILES) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      const found = (src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).map((c) => c.toLowerCase())
      const bad = found.filter((c) => !ALLOWED.has(c))
      expect({ file: f, bad }).toEqual({ file: f, bad: [] })
    }
  })
})
