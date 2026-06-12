'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import {
  createSim, step, idx, EMPTY, SAND, WATER, WALL, FIRE, PLANT, LAVA, GUNPOWDER, STEAM, FIRE_LIFE, type Sim,
} from '@/lib/sandbox/sand'

const W = 150
const H = 170

type RGB = [number, number, number]
const lerp = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

const FIRE_HOT: RGB = [255, 244, 196]
const FIRE_COLD: RGB = [206, 42, 18]

// per-cell colour (fire ramps by age; lava + steam shimmer)
function colorOf(v: number, ageVal: number): RGB {
  switch (v) {
    case EMPTY: return [18, 15, 12]
    case SAND: return [216, 162, 74]
    case WATER: return [54, 116, 132]
    case WALL: return [108, 100, 88]
    case PLANT: return [86, 150, 58]
    case GUNPOWDER: return [70, 66, 58]
    case FIRE: return lerp(FIRE_HOT, FIRE_COLD, Math.min(1, ageVal / FIRE_LIFE))
    case LAVA: return [236, 92, 24]
    case STEAM: return [150, 156, 162]
    default: return [18, 15, 12]
  }
}
// bloom contribution for hot cells (painted to the glow layer)
function glowOf(v: number, ageVal: number): RGB | null {
  if (v === FIRE) return lerp([255, 210, 120], [180, 40, 20], Math.min(1, ageVal / FIRE_LIFE))
  if (v === LAVA) return [255, 130, 40]
  return null
}

type Tool = { v: number; label: string; swatch: string }
const TOOLS: Tool[] = [
  { v: SAND, label: 'sand', swatch: 'rgb(216,162,74)' },
  { v: WATER, label: 'water', swatch: 'rgb(54,116,132)' },
  { v: STEAM, label: 'steam', swatch: 'rgb(150,156,162)' },
  { v: PLANT, label: 'plant', swatch: 'rgb(86,150,58)' },
  { v: WALL, label: 'stone', swatch: 'rgb(108,100,88)' },
  { v: LAVA, label: 'lava', swatch: 'rgb(236,92,24)' },
  { v: GUNPOWDER, label: 'powder', swatch: 'rgb(70,66,58)' },
  { v: FIRE, label: 'fire', swatch: 'rgb(255,150,60)' },
  { v: EMPTY, label: 'erase', swatch: '#120f0c' },
]

export default function FallingSand({ onClose }: { onClose: () => void }) {
  const baseRef = useRef<HTMLCanvasElement>(null)
  const glowRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Sim>(createSim(W, H))
  const downRef = useRef(false)
  const [tool, setTool] = useState(LAVA)
  const [brush, setBrush] = useState(4)
  const [running, setRunning] = useState(true)
  const toolRef = useRef(tool)
  const brushRef = useRef(brush)
  const runRef = useRef(running)
  useEffect(() => { toolRef.current = tool; brushRef.current = brush; runRef.current = running })

  // an inviting opening scene: stone floor, a sand dune, a water pool, a sprout
  useEffect(() => {
    const s = simRef.current
    for (let x = 0; x < W; x++) s.cells[idx(x, H - 1, W)] = WALL
    for (let x = 0; x < W; x++) s.cells[idx(x, H - 2, W)] = WALL
    for (let x = 40; x < 95; x++) for (let y = 0; y < 26; y++) if (Math.random() < 0.9) s.cells[idx(x, y, W)] = SAND
    for (let x = 10; x < 34; x++) s.cells[idx(x, H - 3, W)] = WATER
    for (let y = H - 12; y < H - 2; y++) s.cells[idx(120, y, W)] = PLANT
  }, [])

  function paintAt(clientX: number, clientY: number) {
    const cv = baseRef.current
    if (!cv) return
    const r = cv.getBoundingClientRect()
    const cx = Math.floor(((clientX - r.left) / r.width) * W)
    const cy = Math.floor(((clientY - r.top) / r.height) * H)
    const s = simRef.current
    const rad = brushRef.current
    const v = toolRef.current
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue
        const x = cx + dx, y = cy + dy
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        if ((v === FIRE || v === GUNPOWDER) && Math.random() > 0.7) continue // scatter so it reads natural
        s.cells[idx(x, y, W)] = v
        s.age[idx(x, y, W)] = 0
      }
    }
  }

  useEffect(() => {
    const base = baseRef.current!.getContext('2d')!
    const glow = glowRef.current!.getContext('2d')!
    const bimg = base.createImageData(W, H)
    const bbuf = new Uint32Array(bimg.data.buffer)
    const gimg = glow.createImageData(W, H)
    const gbuf = new Uint32Array(gimg.data.buffer)
    let raf = 0
    function frame() {
      if (runRef.current) {
        simRef.current = step(simRef.current)
        simRef.current = step(simRef.current)
      }
      const { cells, age } = simRef.current
      for (let i = 0; i < cells.length; i++) {
        const v = cells[i]
        const c = colorOf(v, age[i])
        bbuf[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]
        const g = glowOf(v, age[i])
        if (g) {
          const flick = v === LAVA ? 0.7 + Math.random() * 0.3 : 1
          gbuf[i] = (255 << 24) | ((g[2] * flick) << 16) | ((g[1] * flick) << 8) | (g[0] * flick)
        } else {
          gbuf[i] = 0
        }
      }
      base.putImageData(bimg, 0, 0)
      glow.putImageData(gimg, 0, 0)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <SandboxModal
      title="the terrarium"
      onClose={onClose}
      width={440}
      panelBg="#161310"
      panelFg="#e9e2d4"
      borderColor="#000"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a8276' }}>reactive physics</span>}
    >
      <div style={{ padding: 14, background: '#0c0a08' }}>
        <div
          style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, border: '1px solid #2a2620', borderRadius: 2, overflow: 'hidden', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.85)', touchAction: 'none' }}
          onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); downRef.current = true; paintAt(e.clientX, e.clientY) }}
          onPointerMove={(e) => { if (downRef.current) paintAt(e.clientX, e.clientY) }}
          onPointerUp={() => { downRef.current = false }}
        >
          <canvas ref={baseRef} width={W} height={H} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }} />
          <canvas ref={glowRef} width={W} height={H} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'blur(3px) saturate(1.3)', mixBlendMode: 'screen', pointerEvents: 'none', opacity: 0.95 }} />
        </div>

        {/* element tray */}
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
          {TOOLS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTool(t.v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: tool === t.v ? '#0c0a08' : '#cfc7b8',
                background: tool === t.v ? '#e9e2d4' : 'transparent',
                border: '1px solid #3a352d', cursor: 'pointer', borderRadius: 2,
              }}
            >
              <span style={{ width: 11, height: 11, background: t.swatch, border: '1px solid #000', display: 'inline-block' }} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center" style={{ gap: 14, marginTop: 12, flexWrap: 'wrap' }}>
          <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a8276', display: 'flex', alignItems: 'center', gap: 6 }}>
            brush
            <input type="range" min={1} max={9} value={brush} onChange={(e) => setBrush(+e.target.value)} style={{ accentColor: '#e84c28' }} />
          </label>
          <button onClick={() => setRunning((r) => !r)} style={btn}>{running ? 'pause' : 'run'}</button>
          <button onClick={() => { simRef.current = createSim(W, H) }} style={btn}>clear</button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#6f685d', marginTop: 10, lineHeight: 1.5 }}>
          lava + water = stone + steam. fire spreads, water douses it. gunpowder chain-detonates. plants drink water and grow. try lava on a powder trail.
        </p>
      </div>
    </SandboxModal>
  )
}

const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0c0a08',
  background: '#e9e2d4', border: '1px solid #000', padding: '5px 12px',
  cursor: 'pointer', borderRadius: 2, fontWeight: 700,
}
