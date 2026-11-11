'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import SandboxModal from './SandboxModal'
import FighterTouchControls from './FighterTouchControls'
import { initMatch, step, hashState, UNIT } from '@/lib/sandbox/fighter/sim'
import { INTRO_FRAMES, ROUND_FRAMES, matchWinner } from '@/lib/sandbox/fighter/match'
import { advance } from '@/lib/sandbox/fighter/loop'
import { cpuInput } from '@/lib/sandbox/fighter/cpu'
import { FIGHTERS, quickPair, type FighterId } from '@/lib/sandbox/fighter/roster'
import { poseFor } from '@/lib/sandbox/fighter/pose'
import { hudRects, TIMER_RECT, NAME_FONT_PX } from '@/lib/sandbox/fighter/hud'
import { isArmed } from '@/lib/sandbox/fighter/combat'
import { sceneFx, sceneRects } from '@/lib/sandbox/fighter/scenes'
import { COMBO_SHOW, CUE_FRAMES, afterDraw, detectEvents, initFx, stepFx, wireFor, type FxState, type Spark } from '@/lib/sandbox/fighter/fx'
import { BUGGED_LINE, COMBO_LINE, MOVES_LINE, HOWTO_KEYS, KEYS_LINE, specialLines, tutorialText } from '@/lib/sandbox/fighter/howto'
import { PALETTE, ANIM_NAMES, type AnimName, type FighterArt, type Sprite } from '@/lib/sandbox/fighter/art/sprite'
import { ART as PENYADAP } from '@/lib/sandbox/fighter/art/si-penyadap'
import { ART as AJUDAN } from '@/lib/sandbox/fighter/art/sang-ajudan'
import { OPPONENT_ART, OPPONENT_PORTRAITS } from '@/lib/sandbox/fighter/art/opponents'
import { STAGE_FOREST, FLOOR_Y } from '@/lib/sandbox/fighter/art/stage-forest'
import { PORTRAITS } from '@/lib/sandbox/fighter/art/portraits'
import { GAME_KEYS, keysToInput } from '@/lib/sandbox/fighter/input'
import { needsRotate, tryLandscape, ROTATE_LINE } from '@/lib/sandbox/fighter/orientation'
import FighterOnlinePanel, { type OnlineView } from './FighterOnlinePanel'
import FighterArcadePanel, { FighterQuickPick, type ArcadeView } from './FighterArcadePanel'
import { bossPhase, reviewOpen } from '@/lib/sandbox/fighter/boss'
import { fitScale } from '@/lib/sandbox/fighter/scale'
import { arcadeMatch, beginFight, currentStage, finishMatch, giveUp, startRun, takeContinue, type ArcadeRun } from '@/lib/sandbox/fighter/arcade/run'
import { openRoom, type RoomHandle } from '@/lib/sandbox/fighter/net/transport'
import { createSession, statusLine, type Session } from '@/lib/sandbox/fighter/net/session'
import { makeRoomCode } from '@/lib/sandbox/fighter/net/room'
import { parseMessage } from '@/lib/sandbox/fighter/net/protocol'
import { afterMatch, loadSettings, saveSettings, stripVisible, withStrip, type Settings } from '@/lib/sandbox/fighter/settings'
import type { Inputs, MatchState } from '@/lib/sandbox/fighter/types'

const W = 320
const H = 180
const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'
const CROUCH_DRAW_H = 46 // a crouched sprite is drawn squashed to this height, feet on the floor
const ART: Record<string, FighterArt> = { 'si-penyadap': PENYADAP, 'sang-ajudan': AJUDAN, ...OPPONENT_ART }
const PORTRAIT_ART: Record<string, Sprite> = { ...PORTRAITS, ...OPPONENT_PORTRAITS }
const IDS: [FighterId, FighterId] = ['si-penyadap', 'sang-ajudan'] // title attract loop and online sides
type ArtIds = [string, string]

type Pair = [HTMLCanvasElement, HTMLCanvasElement] // [facing right, facing left]
type Cache = {
  stage: HTMLCanvasElement
  fighters: Record<string, { frames: Record<AnimName, Pair[]>; smear: Pair; portrait: Pair }>
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

function stageCanvas(scene: number): HTMLCanvasElement {
  const rects = sceneRects(scene)
  if (rects.length === 0) return toCanvas(STAGE_FOREST)
  const c = document.createElement('canvas')
  c.width = STAGE_FOREST.w
  c.height = STAGE_FOREST.h
  const ctx = c.getContext('2d')!
  for (const r of rects) {
    ctx.fillStyle = PALETTE[r.c]
    ctx.fillRect(r.x, r.y, r.w, r.h)
  }
  return c
}

function buildCache(ids: ArtIds, scene: number): Cache {
  const fighters = {} as Cache['fighters']
  for (const id of ids) {
    const a = ART[id]
    const frames = {} as Record<AnimName, Pair[]>
    for (const n of ANIM_NAMES) frames[n] = a.frames[n].map(toPair)
    fighters[id] = { frames, smear: toPair(a.smear), portrait: toPair(PORTRAIT_ART[id]) }
  }
  return { stage: stageCanvas(scene), fighters }
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
    return w === 'draw' ? 'DRAW' : (w === 'p1' ? s.defs[0].label : s.defs[1].label).toUpperCase() + ' WINS'
  }
  return ''
}

const silhouettes = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()
// Paper-colored copy of a sprite, used for the hurt flash.
function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = silhouettes.get(src)
  if (!c) {
    c = document.createElement('canvas')
    c.width = src.width
    c.height = src.height
    const x = c.getContext('2d')!
    x.drawImage(src, 0, 0)
    x.globalCompositeOperation = 'source-in'
    x.fillStyle = PAPER
    x.fillRect(0, 0, c.width, c.height)
    silhouettes.set(src, c)
  }
  return c
}

function px1(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size = 1) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), size, size)
}

const DIAGONALS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]

function drawSpark(ctx: CanvasRenderingContext2D, p: Spark) {
  const cx = p.x
  const cy = FLOOR_Y - p.y
  const t = p.age / p.ttl
  if (p.kind === 'hit') {
    const len = 2 + p.age * 1.4
    for (let k = 1; k <= len; k++) {
      const col = k < len * 0.55 ? PAPER : VERM
      for (const [dx, dy] of DIAGONALS) px1(ctx, cx + dx * k, cy + dy * k, col, k < 3 ? 2 : 1)
    }
    if (p.age < 3) {
      ctx.fillStyle = PAPER
      ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5)
    }
  } else if (p.kind === 'block') {
    const d = 2 + p.age
    for (const [dx, dy] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) px1(ctx, cx + dx * d, cy + dy * d, t < 0.5 ? PAPER : INK, 2)
    px1(ctx, cx, cy - d - 2, PAPER, 2)
    px1(ctx, cx, cy + d, PAPER, 2)
  } else if (p.kind === 'armor') {
    const half = 3 + p.age * 1.6
    ctx.strokeStyle = t < 0.5 ? PAPER : VERM
    ctx.lineWidth = 2
    ctx.strokeRect(Math.round(cx - half) + 0.5, Math.round(cy - half) + 0.5, Math.round(half * 2), Math.round(half * 2))
  } else if (t < 0.85) {
    for (const dir of [-2, -1, 1, 2]) px1(ctx, cx + dir * (2 + p.age * 0.9), cy - 1 - p.age * 0.35 - (Math.abs(dir) === 2 ? 1 : 0), PAPER, 2)
  }
}

function draw(ctx: CanvasRenderingContext2D, s: MatchState, cache: Cache, fx: FxState, reduce: boolean, ids: ArtIds, scene: number) {
  ctx.save()
  if (fx.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 4))
  ctx.drawImage(cache.stage, 0, 0)
  // animated fire and embers over the baked stage; frozen on frame 0 under reduced motion
  for (const p of sceneFx(scene, reduce ? 0 : s.frame)) {
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, 1, 1)
  }

  s.fighters.forEach((f, i) => {
    const id = ids[i]
    const pose = poseFor(f, s.defs[i], s.frame, s.phase === 'ko' ? s.phaseFrame : 99)
    const dir = f.facing === 1 ? 0 : 1
    const cx = Math.round(f.x / UNIT)
    const px = cx - 40
    const py = FLOOR_Y - 80 - Math.round(f.y / UNIT)
    const c = cache.fighters[id]
    const frames = c.frames[pose.anim]
    const sprite = frames[Math.min(pose.index, frames.length - 1)][dir]
    const dh = pose.crouch ? CROUCH_DRAW_H : 80
    const top = py + 80 - dh
    ctx.drawImage(fx.hurt[i] > 0 ? silhouette(sprite) : sprite, 0, 0, 80, 80, px, top, 80, dh)
    if (pose.smear) ctx.drawImage(c.smear[dir], 0, 0, 80, 80, px, top, 80, dh)

    // armored move: a shield while it is armed (steady under reduced motion)
    if (isArmed(f, s.defs[i])) {
      const col = !reduce && (s.frame >> 2) & 1 ? VERM : PAPER
      ctx.globalAlpha = 0.18
      ctx.fillStyle = col
      ctx.fillRect(cx - 22, py - 2, 44, 84)
      ctx.globalAlpha = 1
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.strokeRect(cx - 22 + 1, py - 2 + 1, 42, 82)
    }

    // marking move: the wire, a vermilion line with an ink edge so it reads against the fire
    const wire = wireFor(f, s.defs[i])
    if (wire) {
      const x = Math.round(Math.min(wire.x0, wire.x1))
      const w = Math.max(1, Math.round(Math.abs(wire.x1 - wire.x0)))
      const y = Math.round(FLOOR_Y - wire.y)
      ctx.fillStyle = INK
      ctx.fillRect(x - 1, y - 3, w + 2, 6)
      ctx.fillStyle = VERM
      ctx.fillRect(x, y - 2, w, 4)
    }

    // BUGGED tag above the marked fighter
    if (f.bugged && f.action !== 'ko') {
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = VERM
      ctx.fillRect(cx - 21, top - 12, 42, 11)
      ctx.strokeStyle = INK
      ctx.lineWidth = 1
      ctx.strokeRect(cx - 21 + 0.5, top - 12 + 0.5, 41, 10)
      ctx.fillStyle = INK
      ctx.fillText('BUGGED', cx, top - 6)
    }
  })

  for (const p of fx.sparks) drawSpark(ctx, p)

  // HUD
  s.fighters.forEach((f, i) => {
    const r = hudRects(i as 0 | 1)
    plate(ctx, r.bar.x, r.bar.y, r.bar.w, r.bar.h)
    const w = Math.round((f.hp / s.defs[i].hp) * (r.bar.w - 4))
    ctx.fillStyle = VERM
    ctx.fillRect(i === 0 ? r.bar.x + r.bar.w - 2 - w : r.bar.x + 2, r.bar.y + 2, w, r.bar.h - 4)
    plate(ctx, r.name.x, r.name.y, r.name.w, r.name.h)
    ctx.font = `bold ${NAME_FONT_PX}px monospace`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillStyle = INK
    ctx.fillText(s.defs[i].label.toUpperCase(), r.name.x + 3, r.name.y + r.name.h / 2 + 0.5)
    // portrait faces inward: the left fighter's looks right, the right fighter's looks left
    plate(ctx, r.portrait.x, r.portrait.y, r.portrait.w, r.portrait.h)
    ctx.drawImage(cache.fighters[ids[i]].portrait[i === 0 ? 0 : 1], r.portrait.x + 1, r.portrait.y + 1)
    plate(ctx, r.pips.x, r.pips.y, r.pips.w, r.pips.h)
    for (let k = 0; k < 2; k++) {
      ctx.fillStyle = k < s.wins[i] ? VERM : PAPER
      ctx.strokeStyle = INK
      const wx = r.pips.x + 8 + k * 11
      const wy = r.pips.y + Math.floor((r.pips.h - 7) / 2)
      ctx.fillRect(wx, wy, 7, 7)
      ctx.strokeRect(wx + 0.5, wy + 0.5, 6, 6)
    }
  })
  plate(ctx, TIMER_RECT.x, TIMER_RECT.y, TIMER_RECT.w, TIMER_RECT.h)
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = 'bold 10px monospace'
  ctx.fillText(String(Math.ceil(s.roundTimer / 60)), W / 2, 9)

  if (fx.combo.by !== null && fx.combo.count >= 2 && fx.combo.age < COMBO_SHOW) {
    const r = hudRects(fx.combo.by)
    const label = fx.combo.count + ' HIT'
    ctx.font = 'bold 12px monospace'
    const tw = Math.ceil(ctx.measureText(label).width) + 10
    const bx = fx.combo.by === 0 ? r.name.x : r.name.x + r.name.w - tw
    plate(ctx, bx, 48, tw, 16)
    ctx.fillStyle = VERM
    ctx.fillRect(bx + 2, 50, 3, 12)
    ctx.fillStyle = INK
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, bx + 7, 56.5)
  }

  // boss plate: which phase, and in phase 3 whether the headline is up (the only time a hit finishes it)
  if (s.defs[1].boss && (s.phase === 'fight' || s.phase === 'ko')) {
    const phase = bossPhase(s.fighters[1].hp, s.defs[1].hp)
    const open = phase === 3 && reviewOpen(ROUND_FRAMES - s.roundTimer)
    const text = open ? 'LIVE: HIT NOW' : phase === 1 ? 'PERNYATAAN' : phase === 2 ? 'ROMBAK' : 'TINJAU ABADI'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = Math.ceil(ctx.measureText(text).width) + 10
    const bx = Math.round((W - tw) / 2)
    plate(ctx, bx, 30, tw, 12)
    if (open) {
      ctx.fillStyle = VERM
      ctx.fillRect(bx + 1, 31, tw - 2, 10)
      ctx.fillStyle = PAPER
    } else {
      ctx.fillStyle = INK
    }
    ctx.fillText(text, W / 2, 36.5)
  }

  // stage cue: the REDO stamp over a revived fighter, or the nameplate after a phone ring (blinks out at the end)
  if (fx.cue && (fx.cue.age < CUE_FRAMES - 14 || Math.floor(fx.cue.age / 3) % 2 === 0)) {
    const stamp = fx.cue.text === 'REDO'
    ctx.font = stamp ? 'bold 12px monospace' : 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = Math.ceil(ctx.measureText(fx.cue.text).width) + (stamp ? 14 : 10)
    const th = stamp ? 18 : 12
    const cx = Math.max(Math.ceil(tw / 2), Math.min(W - Math.ceil(tw / 2), Math.round(fx.cue.x)))
    const cy = stamp ? 52 - Math.min(fx.cue.age, 6) : 48
    plate(ctx, cx - Math.floor(tw / 2), cy, tw, th)
    ctx.fillStyle = stamp ? VERM : INK
    if (stamp) ctx.fillRect(cx - Math.floor(tw / 2) + 1, cy + 1, tw - 2, th - 2)
    ctx.fillStyle = stamp ? PAPER : INK
    ctx.fillText(fx.cue.text, cx, cy + th / 2 + 0.5)
  }

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
  if (!reduce && (fx.flash > 0 || fx.koFlash > 0)) {
    ctx.globalAlpha = fx.koFlash > 0 ? Math.min(0.85, 0.15 + fx.koFlash * 0.07) : 0.35
    ctx.fillStyle = fx.koFlash > 5 ? VERM : PAPER
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
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const settingsRef = useRef(settings)
  const [tutorial, setTutorial] = useState(false)
  const [howTo, setHowTo] = useState(false)
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const update = (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
    saveSettings(next)
  }
  const [showTouch, setShowTouch] = useState(false)
  const [rotate, setRotate] = useState(false)
  const [onlineView, setOnlineView] = useState<OnlineView | null>(null)
  const onlineRef = useRef<{ room: RoomHandle; role: 'host' | 'guest'; side: 0 | 1; session: Session | null; seed: number; timer: number | null } | null>(null)
  const [online, setOnline] = useState<{ role: 'host' | 'guest'; live: boolean } | null>(null) // live = the session is still healthy
  const rotateRef = useRef(false)
  const [arcadeView, setArcadeView] = useState<ArcadeView | null>(null)
  const arcadeRef = useRef<ArcadeRun | null>(null)
  const [quickPick, setQuickPick] = useState(false)
  const quickIdsRef = useRef<[FighterId, FighterId]>(IDS) // quick match vs CPU: [human hero, CPU]
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

  // touch device held upright: pause and ask for landscape
  useEffect(() => {
    const check = () => {
      const r = needsRotate(showTouch, window.innerWidth, window.innerHeight)
      rotateRef.current = r
      setRotate(r)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [showTouch])

  // scale to fill the wrapper: whole numbers when close, a fraction on phones
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const fit = () => setScale(fitScale(el.clientWidth, el.clientHeight))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // result buttons appear shortly after the result text so a held Block key (Space) cannot trigger REMATCH
  useEffect(() => {
    if (!result) return
    const id = window.setTimeout(() => setReadyFor(round + ':' + result), 700)
    return () => window.clearTimeout(id)
  }, [result, round])
  const resultReady = result !== null && readyFor === round + ':' + result

  // one-time 10 second controls overlay inside the first match
  useEffect(() => {
    if (mode !== 'play' || settingsRef.current.tutorialSeen) return
    setTutorial(true)
    const id = window.setTimeout(() => {
      setTutorial(false)
      update({ tutorialSeen: true })
    }, 10000)
    return () => window.clearTimeout(id)
  }, [mode, round])

  // game loop: fixed-step sim, rAF render. Title screen runs CPU vs CPU as an attract loop.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.imageSmoothingEnabled = false
    const live = onlineRef.current?.session ? onlineRef.current : null
    const on = live?.session ?? null
    const seed = live ? live.seed : ((Date.now() & 0x7fffffff) | 1) >>> 0
    let sampled = 0
    const run = !live && arcadeRef.current?.status === 'fight' ? arcadeRef.current : null
    // arcade: the hero fights on the left; the placeholder opponent borrows the other fighter's art
    // quick match uses the picked pair; the title attract loop and online keep the fixed pair
    const pair: [FighterId, FighterId] = !live && !run && mode === 'play' ? quickIdsRef.current : IDS
    const ids: ArtIds = run ? [run.hero, currentStage(run).opponent.id] : pair
    const scene = run ? run.stage : 0
    const cache = buildCache(ids, scene)
    const cpuLevel = run ? currentStage(run).cpu : settingsRef.current.cpu
    let s = run ? arcadeMatch(run) : initMatch(seed, [FIGHTERS[pair[0]], FIGHTERS[pair[1]]], INTRO_FRAMES)
    let accum = 0
    let last: number | null = null
    let raf = 0
    let fx = initFx()
    let reported = false
    let endTicks = 0
    setResult(null)

    const onVis = () => {
      last = null
    }
    document.addEventListener('visibilitychange', onVis)

    const tick = (ts: number) => {
      if (rotateRef.current) {
        last = null
        raf = requestAnimationFrame(tick)
        return
      }
      const dt = last === null ? 0 : ts - last
      last = ts
      humanInput.current = keysToInput(keysRef.current) | touchBits.current
      const r = advance(accum, dt)
      accum = r.accum
      for (let i = 0; i < r.steps; i++) {
        const attract = !on && modeRef.current === 'title'
        let next = s
        if (on) {
          // one local sample per executed frame; the session decides when both inputs are in
          if (sampled <= s.frame) {
            on.sample(humanInput.current)
            sampled++
          }
          const inp = on.advance(performance.now())
          if (!inp) break
          next = step(s, inp as Inputs)
          on.checkpoint(next.frame, hashState(next))
        } else {
          let p1 = humanInput.current
          if (attract) {
            const c0 = cpuInput(next, 0, 'normal')
            next = { ...next, seed: c0.seed }
            p1 = c0.input
          }
          const c1 = cpuInput(next, 1, cpuLevel)
          next = step({ ...next, seed: c1.seed }, [p1, c1.input] as Inputs)
        }
        // effects step once per sim step, so a rendered frame that runs several steps loses none
        fx = stepFx(fx, detectEvents(s, next), reduceRef.current)
        s = next
        if (s.phase === 'matchEnd') {
          endTicks++
          if (attract && endTicks > 180) {
            endTicks = 0
            s = initMatch(((s.seed * 1103515245 + 12345) >>> 0) | 1, [FIGHTERS[IDS[0]], FIGHTERS[IDS[1]]], INTRO_FRAMES)
          } else if (run && !reported) {
            // let the winner banner show for a beat, then hand the result to the arcade screens
            if (endTicks > 90) {
              reported = true
              const w = matchWinner(s)
              const next = finishMatch(run, w === 'p1' ? 'p1' : w === 'p2' ? 'p2' : 'draw')
              arcadeRef.current = next
              setArcadeView(next)
            }
          } else if (!attract && !run && !reported) {
            reported = true
            const w = matchWinner(s)
            update(afterMatch(settingsRef.current))
            setResult(w === 'draw' ? 'Draw' : w === 'p1' ? FIGHTERS[pair[0]].label + ' wins' : FIGHTERS[pair[1]].label + ' wins')
          }
        }
      }
      if (on && on.status !== 'playing' && !reported) {
        reported = true
        setOnline((v) => (v ? { ...v, live: false } : v))
        setResult(statusLine(on.status))
      }
      draw(ctx, s, cache, fx, reduceRef.current, ids, scene)
      fx = afterDraw(fx)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [mode, round])

  const newSeed = () => ((Math.random() * 0x7ffffffe) | 0) + 1

  const closeOnline = useCallback(() => {
    const o = onlineRef.current
    onlineRef.current = null
    if (!o) return
    if (o.timer !== null) window.clearTimeout(o.timer)
    o.room.send({ t: 'bye' })
    window.setTimeout(() => o.room.close(), 250)
  }, [])
  useEffect(() => closeOnline, [closeOnline])

  const beginOnline = (seed: number) => {
    const o = onlineRef.current
    if (!o) return
    if (o.timer !== null) {
      window.clearTimeout(o.timer)
      o.timer = null
    }
    // every in-match message carries the match seed, so stragglers from the previous match are dropped
    o.session = createSession(o.side, (m) => o.room.send({ ...(m as object), m: seed }))
    o.seed = seed
    setOnlineView(null)
    setOnline({ role: o.role, live: true })
    setResult(null)
    setMode('play')
    setRound((r) => r + 1)
  }

  const goOnline = (role: 'host' | 'guest', code: string) => {
    if (showTouch) void tryLandscape(document.documentElement, window.screen as Parameters<typeof tryLandscape>[1])
    closeOnline()
    const fail = (error: string) => {
      closeOnline()
      setOnlineView({ kind: 'menu', error })
    }
    const room = openRoom(code, {
      onStatus: (st) => {
        if (st === 'error') fail('Could not connect')
        else if (st === 'ready') setOnlineView((v) => (v && v.kind === 'lobby' ? { ...v, connected: true } : v))
      },
      onPeers: (n) => {
        const o = onlineRef.current
        if (!o || o.session) return
        if (role === 'guest' && n > 2) fail('Room full')
        else if (role === 'host' && n === 2) {
          const seed = newSeed()
          o.room.send({ t: 'start', seed })
          beginOnline(seed)
        }
      },
      onMessage: (raw) => {
        const o = onlineRef.current
        if (!o) return
        const m = parseMessage(raw)
        if (!m) return
        if (m.t === 'start') {
          if (role === 'guest') beginOnline(m.seed)
          return
        }
        if (m.t !== 'bye' && (raw as { m?: unknown }).m !== o.seed) return
        o.session?.receive(raw, performance.now())
      },
    })
    const timer = role === 'guest' ? window.setTimeout(() => fail('Room not found'), 9000) : null
    onlineRef.current = { room, role, side: role === 'host' ? 0 : 1, session: null, seed: 0, timer }
    setOnlineView({ kind: 'lobby', role, code, connected: false })
  }

  const rematchOnline = () => {
    const o = onlineRef.current
    if (!o || o.role !== 'host') return
    const seed = newSeed()
    o.room.send({ t: 'start', seed })
    beginOnline(seed)
  }

  const openArcade = () => {
    if (showTouch) void tryLandscape(document.documentElement, window.screen as Parameters<typeof tryLandscape>[1])
    setArcadeView('pick')
  }
  const setRun = (r: ArcadeRun | null) => {
    arcadeRef.current = r
    setArcadeView(r)
  }
  const arcadeFight = () => {
    const r = arcadeRef.current
    if (!r) return
    setRun(beginFight(r))
    setResult(null)
    setMode('play')
    setRound((n) => n + 1)
  }
  const arcadeExit = () => {
    setRun(null)
    setMode('title')
    setRound((n) => n + 1)
  }

  const startQuick = (hero: FighterId) => {
    quickIdsRef.current = quickPair(hero)
    setQuickPick(false)
    start()
  }
  const start = () => {
    if (showTouch) void tryLandscape(document.documentElement, window.screen as Parameters<typeof tryLandscape>[1])
    setResult(null)
    setMode('play')
    setRound((r) => r + 1)
  }

  const showStrip = stripVisible(settings, showTouch)

  return (
    <SandboxModal title="FIGHTER" onClose={onClose} fullscreen bare={showTouch} panelBg={INK} panelFg={PAPER} borderColor={INK} titleFont="var(--font-mono)">
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: INK }}>
        <div ref={wrapRef} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: INK }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            role="img"
            aria-label="Pixel fighting game: Si Penyadap versus Sang Ajudan in a burning forest"
            style={{ width: W * scale, height: H * scale, imageRendering: 'pixelated', display: 'block' }}
          />
          {showTouch && (
            <button onClick={onClose} aria-label="close" style={{ position: 'absolute', top: 6, right: 6, zIndex: 6, minWidth: 44, minHeight: 44, background: INK, color: PAPER, border: `1px solid ${PAPER}`, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 14, cursor: 'pointer' }}>
              ✕
            </button>
          )}
          {rotate && (
            <div role="alert" style={{ ...overlay, top: 0, bottom: 0, justifyContent: 'center', background: INK, zIndex: 5 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: VERM, textAlign: 'center' }}>{ROTATE_LINE}</p>
            </div>
          )}
          {mode === 'play' && showTouch && <FighterTouchControls hand={settings.hand} onChange={onTouch} />}
          {arcadeView && arcadeView !== 'pick' && arcadeView.status === 'fight' ? null : arcadeView && (
            <FighterArcadePanel
              view={arcadeView}
              onPick={(hero) => setRun(startRun(hero))}
              onFight={arcadeFight}
              onContinue={() => arcadeRef.current && setRun(takeContinue(arcadeRef.current))}
              onGiveUp={() => arcadeRef.current && setRun(giveUp(arcadeRef.current))}
              onExit={arcadeExit}
            />
          )}
          {quickPick && mode === 'title' && <FighterQuickPick onPick={startQuick} onBack={() => setQuickPick(false)} />}
          {onlineView && (
            <FighterOnlinePanel
              view={onlineView}
              onCreate={() => goOnline('host', makeRoomCode())}
              onJoin={(c) => goOnline('guest', c)}
              onCancel={() => {
                closeOnline()
                setOnlineView(null)
              }}
            />
          )}
          {mode === 'title' && !howTo && !onlineView && !arcadeView && !quickPick && (
            <div style={overlay}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8 }}>fiction and satire</p>
              <button onClick={() => setQuickPick(true)} autoFocus style={btn}>FIGHT CPU</button>
              <button onClick={openArcade} style={btn}>ARCADE</button>
              <button onClick={() => setOnlineView({ kind: 'menu' })} style={btn}>ONLINE</button>
              <button onClick={() => setHowTo(true)} style={smallBtn}>HOW TO PLAY</button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => update({ cpu: settings.cpu === 'easy' ? 'normal' : 'easy' })}
                  aria-label={'CPU difficulty: ' + settings.cpu + '. Activate to change.'}
                  style={smallBtn}
                >
                  CPU: {settings.cpu.toUpperCase()}
                </button>
                <button
                  onClick={() => update({ hand: settings.hand === 'right' ? 'left' : 'right' })}
                  aria-label={'Touch layout: ' + settings.hand + '-handed. Activate to change.'}
                  style={smallBtn}
                >
                  TOUCH: {settings.hand.toUpperCase()}-HANDED
                </button>
                {!showTouch && (
                  <button
                    onClick={() => update(withStrip(settingsRef.current, !settings.strip))}
                    aria-label={'Controls strip under the game: ' + (settings.strip ? 'on' : 'off') + '. Activate to change.'}
                    style={smallBtn}
                  >
                    CONTROLS: {settings.strip ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
            </div>
          )}
          {mode === 'title' && howTo && (
            <div style={{ ...howToPanel }} role="dialog" aria-label="How to play">
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: '0.08em', margin: 0 }}>HOW TO PLAY</h2>
              <p style={howToText}>First to win 2 rounds. Empty the other bar, or lead on health when the timer ends.</p>
              <table style={{ borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                <tbody>
                  {HOWTO_KEYS.map((r) => (
                    <tr key={r.action}>
                      <th scope="row" style={{ textAlign: 'left', fontWeight: 700, paddingRight: 14 }}>{r.action}</th>
                      <td>{r.keys}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={howToText}>{COMBO_LINE}</p>
              <p style={howToText}>{MOVES_LINE}</p>
              <p style={howToText}>{BUGGED_LINE}</p>
              <p style={howToText}>Touch: drag the pad to walk, jump and crouch, tap the buttons.</p>
              {specialLines().map((l) => (
                <p key={l.label} style={howToText}>
                  <strong>{l.label.toUpperCase()}</strong> {l.text}
                </p>
              ))}
              <button onClick={() => setHowTo(false)} autoFocus style={btn}>BACK</button>
            </div>
          )}
          {mode === 'play' && tutorial && !result && (
            <div style={{ ...overlay, top: 44, bottom: 'auto' }} role="note">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: INK, border: `1px solid ${PAPER}`, padding: '6px 10px', maxWidth: '90%', textAlign: 'center' }}>
                {tutorialText(showTouch, settings.hand)}
              </p>
            </div>
          )}
          {mode === 'play' && result && (
            <div style={overlay} role="status" aria-live="polite">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{result}</p>
              {resultReady && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {!online && <button onClick={start} autoFocus style={btn}>REMATCH</button>}
                  {online?.live && online.role === 'host' && (
                    <button onClick={rematchOnline} autoFocus style={btn}>REMATCH</button>
                  )}
                  {online?.live && online.role === 'guest' && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>Waiting for host</span>
                  )}
                  <button onClick={onClose} style={btn}>CLOSE</button>
                </div>
              )}
            </div>
          )}
        </div>
        {showStrip && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '6px 12px', borderTop: `1px solid ${PAPER}`, fontFamily: 'var(--font-mono)', fontSize: 11, color: PAPER }}>
            <span>{KEYS_LINE}</span>
            <button onClick={() => update(withStrip(settingsRef.current, false))} aria-label="Hide the controls strip" style={{ ...smallBtn, minHeight: 28, padding: '2px 8px' }}>HIDE</button>
          </div>
        )}
      </div>
    </SandboxModal>
  )
}

const howToPanel: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: INK, color: PAPER, overflowY: 'auto',
}
const howToText: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 11, maxWidth: 420, textAlign: 'center', margin: 0,
}

const overlay: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, bottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: PAPER,
}
const smallBtn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 10, color: PAPER, background: 'transparent', border: `1px solid ${PAPER}`, padding: '8px 12px', minHeight: 44, cursor: 'pointer', letterSpacing: '0.06em',
}
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK, background: PAPER, border: `2px solid ${INK}`, padding: '10px 18px', minHeight: 44, cursor: 'pointer', letterSpacing: '0.08em',
}
