'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import SandboxModal from './SandboxModal'
import FighterTouchControls from './FighterTouchControls'
import { initMatch, step, UNIT } from '@/lib/sandbox/fighter/sim'
import { INTRO_FRAMES, matchWinner } from '@/lib/sandbox/fighter/match'
import { advance } from '@/lib/sandbox/fighter/loop'
import { cpuInput } from '@/lib/sandbox/fighter/cpu'
import { FIGHTERS, type FighterId } from '@/lib/sandbox/fighter/roster'
import { poseFor } from '@/lib/sandbox/fighter/pose'
import { PALETTE, ANIM_NAMES, type AnimName, type FighterArt, type Sprite } from '@/lib/sandbox/fighter/art/sprite'
import { ART as PENYADAP } from '@/lib/sandbox/fighter/art/si-penyadap'
import { ART as AJUDAN } from '@/lib/sandbox/fighter/art/sang-ajudan'
import { STAGE_FOREST, FLOOR_Y } from '@/lib/sandbox/fighter/art/stage-forest'
import { GAME_KEYS, keysToInput } from '@/lib/sandbox/fighter/input'
import type { Inputs, MatchState } from '@/lib/sandbox/fighter/types'

const W = 320
const H = 180
const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'
const ART: Record<FighterId, FighterArt> = { 'si-penyadap': PENYADAP, 'sang-ajudan': AJUDAN }
const IDS: [FighterId, FighterId] = ['si-penyadap', 'sang-ajudan']

type Pair = [HTMLCanvasElement, HTMLCanvasElement] // [facing right, facing left]
type Cache = {
  stage: HTMLCanvasElement
  fighters: Record<FighterId, { frames: Record<AnimName, Pair[]>; smear: Pair }>
}

function toCanvas(s: Sprite): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = s.w
  c.height = s.h
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(s.w, s.h)
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const ch = s.rows[y][x]
      if (ch === '.') continue
      const hex = PALETTE[ch]
      const i = (y * s.w + x) * 4
      img.data[i] = parseInt(hex.slice(1, 3), 16)
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16)
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return c
}

function toPair(s: Sprite): Pair {
  const right = toCanvas(s)
  const left = document.createElement('canvas')
  left.width = s.w
  left.height = s.h
  const lc = left.getContext('2d')!
  lc.translate(s.w, 0)
  lc.scale(-1, 1)
  lc.drawImage(right, 0, 0)
  return [right, left]
}

function buildCache(): Cache {
  const fighters = {} as Cache['fighters']
  for (const id of IDS) {
    const a = ART[id]
    const frames = {} as Record<AnimName, Pair[]>
    for (const n of ANIM_NAMES) frames[n] = a.frames[n].map(toPair)
    fighters[id] = { frames, smear: toPair(a.smear) }
  }
  return { stage: toCanvas(STAGE_FOREST), fighters }
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PAPER
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

function bannerFor(s: MatchState): string {
  if (s.phase === 'intro') return s.phaseFrame > s.introFrames - 20 ? 'FIGHT' : 'ROUND ' + s.round
  if (s.phase === 'ko') return 'KO'
  if (s.phase === 'matchEnd') {
    const w = matchWinner(s)
    return w === 'draw' ? 'DRAW' : (w === 'p1' ? FIGHTERS[IDS[0]].label : FIGHTERS[IDS[1]].label).toUpperCase() + ' WINS'
  }
  return ''
}

function draw(ctx: CanvasRenderingContext2D, s: MatchState, cache: Cache, fx: { shake: number; flash: boolean }) {
  ctx.save()
  if (fx.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4))
  ctx.drawImage(cache.stage, 0, 0)

  s.fighters.forEach((f, i) => {
    const id = IDS[i]
    const pose = poseFor(f, s.defs[i], s.frame, s.phase === 'ko' ? s.phaseFrame : 99)
    const dir = f.facing === 1 ? 0 : 1
    const px = Math.round(f.x / UNIT) - 40
    const py = FLOOR_Y - 80 - Math.round(f.y / UNIT)
    const c = cache.fighters[id]
    const frames = c.frames[pose.anim]
    ctx.drawImage(frames[Math.min(pose.index, frames.length - 1)][dir], px, py)
    if (pose.smear) ctx.drawImage(c.smear[dir], px, py)
  })

  // HUD
  ctx.font = 'bold 8px monospace'
  ctx.textBaseline = 'top'
  s.fighters.forEach((f, i) => {
    const bx = i === 0 ? 10 : W - 10 - 124
    plate(ctx, bx, 6, 124, 12)
    const w = Math.round((f.hp / s.defs[i].hp) * 120)
    ctx.fillStyle = VERM
    ctx.fillRect(i === 0 ? bx + 122 - w : bx + 2, 8, w, 8)
    plate(ctx, bx, 20, 84, 11)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.fillText(s.defs[i].label.toUpperCase(), bx + 3, 22)
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = k < s.wins[i] ? VERM : PAPER
      ctx.strokeStyle = INK
      const wx = i === 0 ? bx + 92 + k * 10 : bx + 22 - k * 10 + 0
      ctx.fillRect(wx, 22, 7, 7)
      ctx.strokeRect(wx + 0.5, 22.5, 6, 6)
    }
  })
  plate(ctx, W / 2 - 13, 6, 26, 14)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = 'bold 10px monospace'
  ctx.fillText(String(Math.ceil(s.roundTimer / 60)), W / 2, 9)

  const banner = bannerFor(s)
  if (banner) {
    ctx.font = 'bold 18px monospace'
    const tw = Math.ceil(ctx.measureText(banner).width) + 16
    plate(ctx, Math.round((W - tw) / 2), 66, tw, 28)
    ctx.fillStyle = INK
    ctx.textBaseline = 'middle'
    ctx.fillText(banner, W / 2, 81)
  }
  ctx.restore()
  if (fx.flash) {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
  }
}

export default function Fighter({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(2)
  const [mode, setMode] = useState<'title' | 'play'>('title')
  const [result, setResult] = useState<string | null>(null)
  const [round, setRound] = useState(0) // bump to restart the match
  const reduceRef = useRef(false)
  const modeRef = useRef<'title' | 'play'>('title')
  const humanInput = useRef(0)
  const keysRef = useRef(new Set<string>())
  const touchBits = useRef(0)
  const playingRef = useRef(false)
  const [showTouch, setShowTouch] = useState(false)
  const onTouch = useCallback((bits: number) => {
    touchBits.current = bits
  }, [])

  useEffect(() => {
    reduceRef.current = !!reduce
  }, [reduce])
  useEffect(() => {
    modeRef.current = mode
    playingRef.current = mode === 'play' && !result
  }, [mode, result])

  // keyboard: only game keys, and only block page scrolling while a match is live
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!GAME_KEYS.has(e.code)) return
      if (playingRef.current) e.preventDefault()
      keysRef.current.add(e.code)
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    const clear = () => keysRef.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  // show on-screen controls on touch devices
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const upd = () => setShowTouch(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])

  // integer scale to fit the wrapper
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const fit = () => setScale(Math.max(1, Math.floor(Math.min(el.clientWidth / W, el.clientHeight / H))))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // game loop: fixed-step sim, rAF render. Title screen runs CPU vs CPU as an attract loop.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.imageSmoothingEnabled = false
    const cache = buildCache()
    const seed = ((Date.now() & 0x7fffffff) | 1) >>> 0
    let s = initMatch(seed, [FIGHTERS[IDS[0]], FIGHTERS[IDS[1]]], INTRO_FRAMES)
    let accum = 0
    let last: number | null = null
    let raf = 0
    let shake = 0
    let flash = false
    let reported = false
    let endTicks = 0
    setResult(null)

    const onVis = () => {
      last = null
    }
    document.addEventListener('visibilitychange', onVis)

    const tick = (ts: number) => {
      const dt = last === null ? 0 : ts - last
      last = ts
      humanInput.current = keysToInput(keysRef.current) | touchBits.current
      const r = advance(accum, dt)
      accum = r.accum
      for (let i = 0; i < r.steps; i++) {
        const prevHp = s.fighters[0].hp + s.fighters[1].hp
        const attract = modeRef.current === 'title'
        let next = s
        let p1 = humanInput.current
        if (attract) {
          const c0 = cpuInput(next, 0, 'normal')
          next = { ...next, seed: c0.seed }
          p1 = c0.input
        }
        const c1 = cpuInput(next, 1, 'easy')
        next = step({ ...next, seed: c1.seed }, [p1, c1.input] as Inputs)
        if (next.fighters[0].hp + next.fighters[1].hp < prevHp && !reduceRef.current) shake = 6
        // one-frame flash on the step a hit lands
        flash = s.hitstop === 0 && next.hitstop > 0 && !reduceRef.current
        s = next
        if (shake > 0) shake--
        if (s.phase === 'matchEnd') {
          endTicks++
          if (attract && endTicks > 180) {
            endTicks = 0
            s = initMatch(((s.seed * 1103515245 + 12345) >>> 0) | 1, [FIGHTERS[IDS[0]], FIGHTERS[IDS[1]]], INTRO_FRAMES)
          } else if (!attract && !reported) {
            reported = true
            const w = matchWinner(s)
            setResult(w === 'draw' ? 'Draw' : w === 'p1' ? FIGHTERS[IDS[0]].label + ' wins' : FIGHTERS[IDS[1]].label + ' wins')
          }
        }
      }
      draw(ctx, s, cache, { shake, flash })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mode, round])

  const start = () => {
    setResult(null)
    setMode('play')
    setRound((r) => r + 1)
  }

  return (
    <SandboxModal title="FIGHTER" onClose={onClose} fullscreen panelBg={INK} panelFg={PAPER} borderColor="#000" titleFont="var(--font-mono)">
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          role="img"
          aria-label="Pixel fighting game: Si Penyadap versus Sang Ajudan in a burning forest"
          style={{ width: W * scale, height: H * scale, imageRendering: 'pixelated', display: 'block' }}
        />
        {mode === 'play' && showTouch && <FighterTouchControls hand="right" onChange={onTouch} />}
        {mode === 'title' && (
          <div style={overlay}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8 }}>fiction and satire</p>
            <button onClick={start} autoFocus style={btn}>FIGHT CPU</button>
          </div>
        )}
        {mode === 'play' && result && (
          <div style={overlay} role="status" aria-live="polite">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{result}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={start} autoFocus style={btn}>REMATCH</button>
              <button onClick={onClose} style={btn}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    </SandboxModal>
  )
}

const overlay: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, bottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: PAPER,
}
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK, background: PAPER, border: `2px solid ${INK}`, padding: '10px 18px', minHeight: 44, cursor: 'pointer', letterSpacing: '0.08em',
}
