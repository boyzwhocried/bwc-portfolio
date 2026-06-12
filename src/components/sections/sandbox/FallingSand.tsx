'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import { createSim, step, idx, EMPTY, SAND, WATER, WALL, FIRE, PLANT, type Sim } from '@/lib/sandbox/sand'

const W = 120
const H = 150

// terrarium palette (RGB) indexed by cell value
const COLORS: Record<number, [number, number, number]> = {
  [EMPTY]: [20, 17, 13],
  [SAND]: [216, 162, 74],
  [WATER]: [59, 122, 130],
  [WALL]: [122, 112, 96],
  [FIRE]: [232, 76, 40],
  [PLANT]: [90, 143, 60],
}

type Tool = { v: number; label: string; swatch: string }
const TOOLS: Tool[] = [
  { v: SAND, label: 'sand', swatch: 'rgb(216,162,74)' },
  { v: WATER, label: 'water', swatch: 'rgb(59,122,130)' },
  { v: WALL, label: 'stone', swatch: 'rgb(122,112,96)' },
  { v: PLANT, label: 'plant', swatch: 'rgb(90,143,60)' },
  { v: FIRE, label: 'fire', swatch: 'rgb(232,76,40)' },
  { v: EMPTY, label: 'erase', swatch: '#14110d' },
]

export default function FallingSand({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Sim>(createSim(W, H))
  const downRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const [tool, setTool] = useState(SAND)
  const [brush, setBrush] = useState(3)
  const [running, setRunning] = useState(true)
  const toolRef = useRef(tool)
  const brushRef = useRef(brush)
  const runRef = useRef(running)
  toolRef.current = tool
  brushRef.current = brush
  runRef.current = running

  // seed a little starter scene so it is never an empty void on open
  useEffect(() => {
    const s = simRef.current
    for (let x = 20; x < 100; x++) s.cells[idx(x, H - 1, W)] = WALL
    for (let x = 40; x < 80; x++) for (let y = 0; y < 22; y++) s.cells[idx(x, y, W)] = SAND
  }, [])

  function paintAt(clientX: number, clientY: number) {
    const cv = canvasRef.current
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
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        // don't carpet-bomb fire; scatter it so it reads as flame
        if (v === FIRE && Math.random() > 0.6) continue
        s.cells[idx(x, y, W)] = v
        if (v !== FIRE) s.age[idx(x, y, W)] = 0
      }
    }
  }

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    const img = ctx.createImageData(W, H)
    const buf = new Uint32Array(img.data.buffer)
    let raf = 0
    function frame() {
      if (runRef.current) {
        simRef.current = step(simRef.current)
        // a second sub-step makes liquids/flames feel lively
        simRef.current = step(simRef.current)
      }
      const cells = simRef.current.cells
      for (let i = 0; i < cells.length; i++) {
        let c = COLORS[cells[i]] ?? COLORS[EMPTY]
        if (cells[i] === FIRE && Math.random() < 0.5) c = [245, 166, 35]
        // little ABGR pack (canvas is RGBA little-endian)
        buf[i] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]
      }
      ctx.putImageData(img, 0, 0)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <SandboxModal
      title="the terrarium"
      onClose={onClose}
      width={420}
      panelBg="#1a1714"
      panelFg="#e9e2d4"
      borderColor="#000"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a8276' }}>paint physics</span>}
    >
      <div style={{ padding: 14, background: '#0e0c0a' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            downRef.current = true
            lastRef.current = { x: e.clientX, y: e.clientY }
            paintAt(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (!downRef.current) return
            paintAt(e.clientX, e.clientY)
          }}
          onPointerUp={() => { downRef.current = false }}
          style={{
            width: '100%',
            aspectRatio: `${W} / ${H}`,
            imageRendering: 'pixelated',
            border: '1px solid #2a2620',
            display: 'block',
            touchAction: 'none',
            borderRadius: 2,
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
          }}
        />

        {/* element tray */}
        <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
          {TOOLS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTool(t.v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 9px',
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: tool === t.v ? '#0e0c0a' : '#cfc7b8',
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
            <input type="range" min={1} max={8} value={brush} onChange={(e) => setBrush(+e.target.value)} style={{ accentColor: '#e84c28' }} />
          </label>
          <button onClick={() => setRunning((r) => !r)} style={btn}>{running ? 'pause' : 'run'}</button>
          <button onClick={() => { simRef.current = createSim(W, H) }} style={btn}>clear</button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#6f685d', marginTop: 10, lineHeight: 1.5 }}>
          drag to paint. fire eats plant. water douses fire. sand sinks through water.
        </p>
      </div>
    </SandboxModal>
  )
}

const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0e0c0a',
  background: '#e9e2d4', border: '1px solid #000', padding: '5px 12px',
  cursor: 'pointer', borderRadius: 2, fontWeight: 700,
}
