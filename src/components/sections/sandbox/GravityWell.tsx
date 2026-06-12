'use client'

import { useEffect, useRef, useState } from 'react'
import SandboxModal from './SandboxModal'
import { step, makeBody, supernova, spawnRing, SUPERNOVA_MASS, type Body } from '@/lib/sandbox/orbit'

const STAR_MASS = 2200
const FLING_K = 0.06
const DT = 1
const PREDICT_STEPS = 70
const PLANET_COLORS = ['#ece7de', '#9aa0a6', '#e84c28', '#6ea2c4', '#d8a24a']

type Flash = { x: number; y: number; r: number; max: number; life: number; maxLife: number }

function freshStar(cx: number, cy: number): Body {
  return makeBody({ x: cx, y: cy, mass: STAR_MASS, vx: 0, vy: 0, color: '#ffb24a' })
}

export default function GravityWell({ onClose }: { onClose: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodiesRef = useRef<Body[]>([])
  const dragRef = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null)
  const flashesRef = useRef<Flash[]>([])
  const shakeRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })
  const seededRef = useRef(false)
  const starsRef = useRef<{ x: number; y: number; r: number; a: number }[]>([])
  const [trails, setTrails] = useState(true)
  const trailsRef = useRef(trails)
  useEffect(() => { trailsRef.current = trails })
  const [hud, setHud] = useState({ bodies: 0, charge: 0 })

  function view(clientX: number, clientY: number) {
    const r = wrapRef.current!.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }

  function addFlash(x: number, y: number, max: number) {
    flashesRef.current.push({ x, y, r: max * 0.3, max, life: 1, maxLife: 1 })
  }

  // size the canvas to the wrapper (full-screen, dpr-crisp) + seed once
  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    function resize() {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = { w, h }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      starsRef.current = Array.from({ length: Math.floor((w * h) / 5500) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.2, a: Math.random() * 0.5 + 0.15,
      }))
      if (!seededRef.current && w > 0) {
        seededRef.current = true
        bodiesRef.current = [freshStar(w / 2, h / 2), ...spawnRing(w / 2, h / 2, 4, Math.min(w, h) * 0.22, STAR_MASS)]
      }
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // main loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    let raf = 0
    function frame() {
      const { w, h } = sizeRef.current
      const before = bodiesRef.current
      const after = step(before, DT)

      // collision spectacle: a body that just got absorbed flashes at its last spot
      for (let i = 0; i < before.length; i++) {
        if (before[i].alive && !after[i].alive) {
          addFlash(after[i].x, after[i].y, 14 + before[i].radius * 1.5)
          shakeRef.current = Math.max(shakeRef.current, 4)
        }
      }

      // supernova when the star is over-fed
      let bodies = after
      if (bodies[0] && bodies[0].mass >= SUPERNOVA_MASS) {
        const dead = bodies[0]
        addFlash(dead.x, dead.y, 120)
        shakeRef.current = 16
        bodies = [freshStar(dead.x, dead.y), ...supernova(dead, 16, 7), ...bodies.slice(1).filter((b) => b.alive)]
      }

      // recycle bodies that drift far off-screen (always keep the star at index 0)
      bodiesRef.current = bodies.filter((b, i) => i === 0 || (b.alive && b.x > -260 && b.x < w + 260 && b.y > -260 && b.y < h + 260))

      // ---- render ----
      ctx.save()
      if (shakeRef.current > 0) { ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7); shakeRef.current-- }
      ctx.fillStyle = '#07070d'
      ctx.fillRect(-10, -10, w + 20, h + 20)
      for (const s of starsRef.current) { ctx.globalAlpha = s.a; ctx.fillStyle = '#cfd2dc'; ctx.fillRect(s.x, s.y, s.r, s.r) }
      ctx.globalAlpha = 1

      ctx.globalCompositeOperation = 'lighter'
      for (const b of bodiesRef.current) {
        if (!b.alive) continue
        // comet trail, coloured by speed
        if (trailsRef.current && b.trail.length > 1) {
          const sp = Math.min(1, Math.hypot(b.vx, b.vy) / 14)
          ctx.strokeStyle = sp > 0.5 ? 'rgba(150,200,255,0.5)' : 'rgba(232,140,60,0.5)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(b.trail[0].x, b.trail[0].y)
          for (const p of b.trail) ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.6)
        g.addColorStop(0, b.color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2.6, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = b.color
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill()
      }

      // flashes (shockwave rings)
      flashesRef.current = flashesRef.current.filter((f) => f.life > 0)
      for (const f of flashesRef.current) {
        const t = 1 - f.life / f.maxLife
        const rr = f.r + (f.max - f.r) * t
        ctx.globalAlpha = f.life
        ctx.strokeStyle = '#ffd27a'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(255,210,122,0.5)'
        ctx.beginPath(); ctx.arc(f.x, f.y, rr * 0.25, 0, Math.PI * 2); ctx.fill()
        f.life -= 0.04
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      // aim + trajectory prediction while dragging
      const d = dragRef.current
      if (d) {
        const tentative = makeBody({ x: d.sx, y: d.sy, vx: (d.cx - d.sx) * FLING_K, vy: (d.cy - d.sy) * FLING_K, mass: 90 })
        let sim = [...bodiesRef.current.map((b) => ({ ...b, trail: [] as { x: number; y: number }[] })), { ...tentative, trail: [] as { x: number; y: number }[] }]
        const last = sim.length - 1
        ctx.strokeStyle = 'rgba(236,231,222,0.55)'
        ctx.setLineDash([2, 4])
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(d.sx, d.sy)
        for (let k = 0; k < PREDICT_STEPS; k++) { sim = step(sim, DT); const p = sim[last]; if (!p.alive) break; ctx.lineTo(p.x, p.y) }
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = 'rgba(232,76,40,0.9)'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(d.sx, d.sy); ctx.lineTo(d.cx, d.cy); ctx.stroke()
        ctx.fillStyle = '#ece7de'; ctx.beginPath(); ctx.arc(d.sx, d.sy, 4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      const star = bodiesRef.current[0]
      setHud({ bodies: bodiesRef.current.filter((b) => b.alive).length, charge: star ? Math.min(1, star.mass / SUPERNOVA_MASS) : 0 })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  function spawnSystem() {
    const { w, h } = sizeRef.current
    const star = bodiesRef.current[0] ?? freshStar(w / 2, h / 2)
    bodiesRef.current = [...bodiesRef.current, ...spawnRing(star.x, star.y, 5, Math.min(w, h) * (0.18 + Math.random() * 0.18), star.mass)]
  }
  function reset() {
    const { w, h } = sizeRef.current
    bodiesRef.current = [freshStar(w / 2, h / 2), ...spawnRing(w / 2, h / 2, 4, Math.min(w, h) * 0.22, STAR_MASS)]
    flashesRef.current = []
  }

  return (
    <SandboxModal
      title="the orrery"
      onClose={onClose}
      fullscreen
      panelBg="#07070d"
      panelFg="#cfd2dc"
      borderColor="#000"
      titleFont="var(--font-mono)"
      titleRight={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6e7280' }}>bodies {hud.bodies}</span>}
    >
      <div
        ref={wrapRef}
        style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair', overflow: 'hidden' }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); const p = view(e.clientX, e.clientY); dragRef.current = { sx: p.x, sy: p.y, cx: p.x, cy: p.y } }}
        onPointerMove={(e) => { if (!dragRef.current) return; const p = view(e.clientX, e.clientY); dragRef.current.cx = p.x; dragRef.current.cy = p.y }}
        onPointerUp={() => {
          const d = dragRef.current
          if (d) bodiesRef.current = [...bodiesRef.current, makeBody({ x: d.sx, y: d.sy, vx: (d.cx - d.sx) * FLING_K, vy: (d.cy - d.sy) * FLING_K, mass: 60 + Math.random() * 90, color: PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)] })]
          dragRef.current = null
        }}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

        {/* supernova charge meter */}
        <div style={{ position: 'absolute', top: 14, left: 14, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8a93a0', pointerEvents: 'none' }}>
          <div style={{ marginBottom: 4 }}>star charge</div>
          <div style={{ width: 120, height: 6, background: '#15151f', border: '1px solid #2a2a3a' }}>
            <div style={{ width: `${hud.charge * 100}%`, height: '100%', background: hud.charge > 0.8 ? '#ff5a2a' : '#ffb24a', transition: 'width 0.2s' }} />
          </div>
          {hud.charge > 0.8 && <div style={{ color: '#ff5a2a', marginTop: 3 }}>about to blow</div>}
        </div>

        {/* controls */}
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '92vw' }}>
          <button onClick={spawnSystem} style={{ ...gbtn, background: '#e84c28', color: '#0a0a12', borderColor: '#e84c28' }}>+ system</button>
          <button onClick={() => setTrails((t) => !t)} style={gbtn}>trails {trails ? 'on' : 'off'}</button>
          <button onClick={reset} style={gbtn}>reset</button>
          <button onClick={() => { const s = bodiesRef.current[0]; bodiesRef.current = s ? [s] : [] }} style={gbtn}>clear</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: '#6e7280', marginLeft: 4 }}>drag to fling · the dotted line shows where it goes · feed the star to detonate it</span>
        </div>
      </div>
    </SandboxModal>
  )
}

const gbtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, color: '#cfd2dc',
  background: 'rgba(20,20,32,0.85)', border: '1px solid #3a3a4a', padding: '6px 12px',
  cursor: 'pointer', borderRadius: 3, fontWeight: 700,
}
