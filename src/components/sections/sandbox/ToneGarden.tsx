'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import { rowToFrequency } from '@/lib/sandbox/scale'

const COLS = 16
const ROWS = 12
const BASE_HZ = 196 // G3

const key = (c: number, r: number) => r * COLS + c

export default function ToneGarden({ onClose }: { onClose: () => void }) {
  const [grid, setGrid] = useState<boolean[]>(() => new Array(COLS * ROWS).fill(false))
  const [playing, setPlaying] = useState(true)
  const [bpm, setBpm] = useState(108)
  const [col, setCol] = useState(0)
  const gridRef = useRef(grid)
  gridRef.current = grid
  const acRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)

  function ensureAudio() {
    if (acRef.current) return acRef.current
    type ACtor = typeof AudioContext
    const Ctor: ACtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext
    if (!Ctor) return null
    const ac = new Ctor()
    const master = ac.createGain()
    master.gain.value = 0.16
    master.connect(ac.destination)
    acRef.current = ac
    masterRef.current = master
    return ac
  }

  function note(freq: number) {
    const ac = acRef.current
    const master = masterRef.current
    if (!ac || !master) return
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const t = ac.currentTime
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(1, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
    osc.connect(g)
    g.connect(master)
    osc.start(t)
    osc.stop(t + 0.4)
  }

  // sequencer clock
  useEffect(() => {
    if (!playing) return
    const stepMs = 60000 / bpm / 2 // eighth notes
    let c = 0
    const id = setInterval(() => {
      c = (c + 1) % COLS
      setCol(c)
      const g = gridRef.current
      for (let r = 0; r < ROWS; r++) {
        if (g[key(c, r)]) note(rowToFrequency(ROWS - 1 - r, BASE_HZ))
      }
    }, stepMs)
    return () => clearInterval(id)
  }, [playing, bpm])

  useEffect(() => {
    return () => { acRef.current?.close().catch(() => {}) }
  }, [])

  function toggle(c: number, r: number) {
    ensureAudio()
    acRef.current?.resume().catch(() => {})
    setGrid((prev) => {
      const next = prev.slice()
      next[key(c, r)] = !next[key(c, r)]
      return next
    })
  }

  function randomize() {
    ensureAudio()
    acRef.current?.resume().catch(() => {})
    setGrid(() => {
      const next = new Array(COLS * ROWS).fill(false)
      // one note per column-ish, biased to a pleasant sparse melody
      for (let c = 0; c < COLS; c++) {
        if (Math.random() < 0.7) next[key(c, Math.floor(Math.random() * ROWS))] = true
        if (Math.random() < 0.25) next[key(c, Math.floor(Math.random() * ROWS))] = true
      }
      return next
    })
  }

  return (
    <SandboxModal
      title="tone garden"
      onClose={onClose}
      width={560}
      panelBg="#13161d"
      panelFg="#cdd3df"
      borderColor="#000"
      titleFont="var(--font-display)"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b7280' }}>paint a loop</span>}
    >
      <div style={{ padding: 14 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 3,
            background: '#0c0e13',
            padding: 6,
            borderRadius: 3,
            border: '1px solid #20242e',
          }}
        >
          {Array.from({ length: ROWS * COLS }).map((_, i) => {
            const c = i % COLS
            const r = Math.floor(i / COLS)
            const lit = grid[key(c, r)]
            const active = c === col
            const hue = 14 + (ROWS - 1 - r) * 4 // amber (low) -> vermilion (high)
            const litColor = `hsl(${hue}, 88%, 56%)`
            return (
              <button
                key={i}
                onClick={() => toggle(c, r)}
                aria-label={`cell ${c},${r}`}
                style={{
                  aspectRatio: '1',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  background: lit ? litColor : active ? '#222936' : '#1a1f29',
                  boxShadow: lit && active ? `0 0 10px 2px ${litColor}` : lit ? `0 0 4px ${litColor}` : 'none',
                  transform: lit && active ? 'scale(1.12)' : 'scale(1)',
                  transition: 'transform 90ms ease, box-shadow 90ms ease',
                  outline: active ? '1px solid rgba(232,76,40,0.4)' : 'none',
                }}
              />
            )
          })}
        </div>

        <div className="flex items-center" style={{ gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => { ensureAudio(); acRef.current?.resume(); setPlaying((p) => !p) }} style={tbtn}>
            {playing ? 'pause' : 'play'}
          </button>
          <button onClick={randomize} style={tbtn}>randomize</button>
          <button onClick={() => setGrid(new Array(COLS * ROWS).fill(false))} style={tbtn}>clear</button>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            {bpm}bpm
            <input type="range" min={60} max={180} value={bpm} onChange={(e) => setBpm(+e.target.value)} style={{ accentColor: '#e84c28' }} />
          </label>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#5d6573', marginTop: 10, lineHeight: 1.5 }}>
          every cell lands on a pentatonic note, so it cannot sound wrong. tap to plant, randomize for a seed.
        </p>
      </div>
    </SandboxModal>
  )
}

const tbtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0c0e13',
  background: '#cdd3df', border: '1px solid #000', padding: '5px 12px',
  cursor: 'pointer', borderRadius: 2, fontWeight: 700,
}
