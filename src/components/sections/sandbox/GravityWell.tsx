'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import { step, makeBody, type Body } from '@/lib/sandbox/orbit'

const VW = 480
const VH = 360
const STAR_MASS = 2000
const FLING_K = 0.06

const PLANET_COLORS = ['#ece7de', '#9aa0a6', '#e84c28', '#6ea2c4', '#d8a24a']

function star(): Body {
  return makeBody({ x: VW / 2, y: VH / 2, mass: STAR_MASS, color: '#e84c28' })
}

function seedSystem(): Body[] {
  const s = star()
  const planets: Body[] = []
  for (let i = 0; i < 3; i++) {
    const d = 70 + i * 38
    const v = Math.sqrt((6 * STAR_MASS) / d) // circular orbit speed
    planets.push(
      makeBody({
        x: VW / 2 + d,
        y: VH / 2,
        vx: 0,
        vy: -v,
        mass: 70 + i * 20,
        color: PLANET_COLORS[(i + 1) % PLANET_COLORS.length],
      })
    )
  }
  return [s, ...planets]
}

export default function GravityWell({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodiesRef = useRef<Body[]>(seedSystem())
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const [trails, setTrails] = useState(true)
  const trailsRef = useRef(trails)
  useEffect(() => { trailsRef.current = trails }) // rAF render reads the latest toggle via this ref
  const [count, setCount] = useState(4)

  function toView(clientX: number, clientY: number) {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: ((clientX - r.left) / r.width) * VW, y: ((clientY - r.top) / r.height) * VH }
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    // static starfield, drawn behind everything each frame
    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * VW,
      y: Math.random() * VH,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
    }))
    let raf = 0
    function frame() {
      bodiesRef.current = step(bodiesRef.current, 1)
      // recycle bodies that drift far off-screen (keep the star)
      bodiesRef.current = bodiesRef.current.filter(
        (b, i) => i === 0 || (b.alive && b.x > -200 && b.x < VW + 200 && b.y > -200 && b.y < VH + 200)
      )

      ctx.fillStyle = '#0a0a12'
      ctx.fillRect(0, 0, VW, VH)
      for (const s of stars) {
        ctx.globalAlpha = s.a
        ctx.fillStyle = '#cfd2dc'
        ctx.fillRect(s.x, s.y, s.r, s.r)
      }
      ctx.globalAlpha = 1

      for (const b of bodiesRef.current) {
        if (!b.alive) continue
        if (trailsRef.current && b.trail.length > 1) {
          ctx.beginPath()
          ctx.moveTo(b.trail[0].x, b.trail[0].y)
          for (const p of b.trail) ctx.lineTo(p.x, p.y)
          ctx.strokeStyle = b.color
          ctx.globalAlpha = 0.22
          ctx.lineWidth = 1
          ctx.stroke()
          ctx.globalAlpha = 1
        }
        // glow
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.4)
        g.addColorStop(0, b.color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius * 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = b.color
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // aim line while slinging
      const d = dragRef.current
      if (d) {
        ctx.strokeStyle = 'rgba(232,76,40,0.8)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.cx, d.cy)
        ctx.stroke()
        ctx.fillStyle = 'rgba(236,231,222,0.85)'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      setCount(bodiesRef.current.filter((b) => b.alive).length)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <SandboxModal
      title="the orrery"
      onClose={onClose}
      width={520}
      panelBg="#0a0a12"
      panelFg="#cfd2dc"
      borderColor="#000"
      titleFont="var(--font-mono)"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6e7280' }}>bodies {count}</span>}
    >
      <div style={{ padding: 14 }}>
        <canvas
          ref={canvasRef}
          width={VW}
          height={VH}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            const p = toView(e.clientX, e.clientY)
            dragRef.current = { x: p.x, y: p.y, cx: p.x, cy: p.y }
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return
            const p = toView(e.clientX, e.clientY)
            dragRef.current.cx = p.x
            dragRef.current.cy = p.y
          }}
          onPointerUp={() => {
            const d = dragRef.current
            if (d) {
              bodiesRef.current = [
                ...bodiesRef.current,
                makeBody({
                  x: d.x,
                  y: d.y,
                  vx: (d.cx - d.x) * FLING_K,
                  vy: (d.cy - d.y) * FLING_K,
                  mass: 60 + Math.random() * 90,
                  color: PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)],
                }),
              ]
            }
            dragRef.current = null
          }}
          style={{
            width: '100%',
            aspectRatio: `${VW} / ${VH}`,
            display: 'block',
            touchAction: 'none',
            border: '1px solid #1c1c28',
            cursor: 'crosshair',
          }}
        />
        <div className="flex items-center" style={{ gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setTrails((t) => !t)} style={gbtn}>trails {trails ? 'on' : 'off'}</button>
          <button onClick={() => { bodiesRef.current = seedSystem() }} style={gbtn}>reset</button>
          <button onClick={() => { bodiesRef.current = [bodiesRef.current[0]] }} style={gbtn}>clear orbits</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#6e7280' }}>
            drag from empty space, release to fling a world.
          </span>
        </div>
      </div>
    </SandboxModal>
  )
}

const gbtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#0a0a12',
  background: '#cfd2dc', border: '1px solid #000', padding: '5px 12px',
  cursor: 'pointer', borderRadius: 2, fontWeight: 700,
}
