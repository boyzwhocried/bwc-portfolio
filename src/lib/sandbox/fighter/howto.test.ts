import { describe, it, expect } from 'vitest'
import { HOWTO_KEYS, KEYS_LINE, specialLines, tutorialText } from './howto'
import { FIGHTERS, FIGHTER_IDS } from './roster'

describe('how to play text', () => {
  it('lists every action once with its keys', () => {
    const actions = HOWTO_KEYS.map((r) => r.action)
    expect(actions).toEqual(['Walk', 'Jump', 'Punch', 'Kick', 'Special', 'Block'])
    for (const r of HOWTO_KEYS) expect(r.keys.length).toBeGreaterThan(0)
  })

  it('the one-line keys hint names every action key', () => {
    for (const k of ['A/D', 'W', 'J', 'K', 'L', 'Space']) expect(KEYS_LINE).toContain(k)
  })

  it('gives each fighter one short special line labelled with its archetype name', () => {
    const lines = specialLines()
    expect(lines.map((l) => l.label)).toEqual(FIGHTER_IDS.map((id) => FIGHTERS[id].label))
    for (const l of lines) {
      expect(l.text.length).toBeGreaterThan(10)
      expect(l.text.length).toBeLessThanOrEqual(90)
      expect(l.text).not.toContain('\n')
    }
  })

  it('the Penyadap line explains the mark bonus and the Ajudan line explains the shield', () => {
    const by = Object.fromEntries(specialLines().map((l) => [l.label, l.text.toLowerCase()]))
    expect(by['Si Penyadap']).toMatch(/bugged/)
    expect(by['Si Penyadap']).toMatch(/25/)
    expect(by['Sang Ajudan']).toMatch(/shield|armor/)
  })

  it('no em-dashes anywhere in the copy', () => {
    const all = [KEYS_LINE, ...HOWTO_KEYS.flatMap((r) => [r.action, r.keys]), ...specialLines().flatMap((l) => [l.label, l.text]), tutorialText(false, 'right'), tutorialText(true, 'right'), tutorialText(true, 'left')]
    for (const t of all) expect(t).not.toContain('—')
  })

  describe('tutorialText', () => {
    it('keyboard text is the keys line', () => {
      expect(tutorialText(false, 'right')).toBe(KEYS_LINE)
      expect(tutorialText(false, 'left')).toBe(KEYS_LINE)
    })

    it('right-handed touch: d-pad on the left, buttons on the right', () => {
      const t = tutorialText(true, 'right')
      expect(t).toMatch(/^Drag on the left/)
      expect(t).toMatch(/Right: punch/)
    })

    it('left-handed touch is mirrored: d-pad on the right, buttons on the left', () => {
      const t = tutorialText(true, 'left')
      expect(t).toMatch(/^Drag on the right/)
      expect(t).toMatch(/Left: punch/)
    })
  })
})
