// Sound cues, synthesized with WebAudio so there are no audio files. Two cues for now:
// the desk phone ring (stage 5 and boss phase 2) and the revive stamp (stage 4).
// soundsFor and toneScript are pure; createAudio is the thin browser layer.
import type { FxEvent } from './fx'

export const SOUND_NAMES = ['ring', 'revive'] as const
export type SoundName = (typeof SOUND_NAMES)[number]

export type Tone = { at: number; dur: number; freq: number; gain: number; wave: OscillatorType }

// Which sounds the events of one sim step call for, in event order, each at most once.
export function soundsFor(events: FxEvent[]): SoundName[] {
  const out: SoundName[] = []
  for (const e of events) {
    const n: SoundName | null = e.kind === 'ring' ? 'ring' : e.kind === 'revive' ? 'revive' : null
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

export function toneScript(name: SoundName): Tone[] {
  if (name === 'ring') {
    // old desk phone: a fast two-tone trill, twice
    const out: Tone[] = []
    for (let burst = 0; burst < 2; burst++) {
      for (let i = 0; i < 6; i++) out.push({ at: burst * 0.7 + i * 0.05, dur: 0.05, freq: i % 2 === 0 ? 1400 : 1100, gain: 0.12, wave: 'square' })
    }
    return out
  }
  // the stamp: a low thump with a click on top, pitch falling
  return [
    { at: 0, dur: 0.05, freq: 180, gain: 0.2, wave: 'triangle' },
    { at: 0.05, dur: 0.12, freq: 110, gain: 0.22, wave: 'triangle' },
    { at: 0.17, dur: 0.18, freq: 70, gain: 0.2, wave: 'sine' },
  ]
}

type Ctx = AudioContext

export function createAudio(): { unlock(): void; play(name: SoundName): void } {
  let ctx: Ctx | null = null
  const get = (): Ctx | null => {
    if (ctx) return ctx
    try {
      const Ac = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
      ctx = Ac ? new Ac() : null
    } catch {
      ctx = null
    }
    return ctx
  }
  return {
    // call from a click handler: browsers keep audio suspended until a user gesture
    unlock() {
      const c = get()
      if (c && c.state === 'suspended') void c.resume().catch(() => undefined)
    },
    play(name) {
      const c = get()
      if (!c || c.state !== 'running') return
      try {
        const t0 = c.currentTime
        for (const t of toneScript(name)) {
          const o = c.createOscillator()
          const g = c.createGain()
          o.type = t.wave
          o.frequency.value = t.freq
          g.gain.setValueAtTime(t.gain, t0 + t.at)
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.at + t.dur)
          o.connect(g)
          g.connect(c.destination)
          o.start(t0 + t.at)
          o.stop(t0 + t.at + t.dur + 0.02)
        }
      } catch {
        // sound is a nicety; the game plays without it
      }
    },
  }
}
