'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

// pipeline panic: you are the staging layer. records stream in; LOAD the clean
// ones into the warehouse, REJECT the dirty ones (nulls, dupes, garbage types).
// wrong call = grain corruption. three corruptions and the monthly close fails.
// speed ramps. tiers: bronze -> silver -> gold, like the real medallion.

type Rec = {
  id: number
  cols: { k: string; v: string }[]
  dirty: string | null // reason if dirty
}

const NAMES = ['andi', 'budi', 'citra', 'dewi', 'eko', 'fitri', 'gilang', 'hana', 'indra', 'joko']
const PRODUCTS = ['AJK', 'MICRO', 'TELE', 'SAG', 'SIB']

function makeRecord(seenIds: Set<number>, level: number): Rec {
  const roll = Math.random()
  const id = Math.floor(Math.random() * 900) + 100

  // dupe: reuse an id the player already loaded
  if (roll < 0.18 && seenIds.size > 2) {
    const ids = [...seenIds]
    const dupId = ids[Math.floor(Math.random() * ids.length)]
    return {
      id: dupId,
      cols: [
        { k: 'id', v: String(dupId) },
        { k: 'name', v: NAMES[Math.floor(Math.random() * NAMES.length)] },
        { k: 'prod', v: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)] },
      ],
      dirty: 'duplicate key',
    }
  }
  // null column
  if (roll < 0.34) {
    return {
      id,
      cols: [
        { k: 'id', v: String(id) },
        { k: 'name', v: 'NULL' },
        { k: 'prod', v: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)] },
      ],
      dirty: 'NULL in NOT NULL column',
    }
  }
  // garbage type
  if (roll < 0.46 && level >= 2) {
    return {
      id,
      cols: [
        { k: 'id', v: String(id) },
        { k: 'name', v: NAMES[Math.floor(Math.random() * NAMES.length)] },
        { k: 'amt', v: ['"12O"', "'banana'", '-0.0e99', '############'][Math.floor(Math.random() * 4)] },
      ],
      dirty: 'type garbage in amt',
    }
  }
  // clean
  return {
    id,
    cols: [
      { k: 'id', v: String(id) },
      { k: 'name', v: NAMES[Math.floor(Math.random() * NAMES.length)] },
      { k: 'prod', v: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)] },
    ],
    dirty: null,
  }
}

function tier(score: number): { name: string; color: string } {
  if (score >= 400) return { name: 'GOLD', color: '#c9a227' }
  if (score >= 180) return { name: 'SILVER', color: '#9aa0a6' }
  return { name: 'BRONZE', color: '#ad6a3e' }
}

const BASE_MS = 3600 // time per record at level 1
const PAPER = '#ece7de'
const INK = '#1a1a1a'

export default function PipelinePanic({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion()
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [strikes, setStrikes] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [level, setLevel] = useState(1)
  const [rec, setRec] = useState<Rec | null>(null)
  const [timeLeft, setTimeLeft] = useState(1) // fraction of window remaining
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)
  const seenIds = useRef<Set<number>>(new Set())
  const deadline = useRef<number>(0)
  const windowMs = useRef<number>(BASE_MS)

  const nextRecord = useCallback(() => {
    const lvl = 1 + Math.floor(seenIds.current.size / 6)
    setLevel(lvl)
    windowMs.current = Math.max(1300, BASE_MS - (lvl - 1) * 420)
    deadline.current = performance.now() + windowMs.current
    setRec(makeRecord(seenIds.current, lvl))
    setTimeLeft(1)
  }, [])

  // countdown loop; timeout = the record slips into the warehouse unchecked
  useEffect(() => {
    if (!running || over || !rec) return
    let raf: number
    const tick = () => {
      const left = (deadline.current - performance.now()) / windowMs.current
      setTimeLeft(Math.max(0, left))
      if (left <= 0) {
        judge(rec.dirty === null) // it fell through: only ok if it was clean
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, rec])

  function judge(correct: boolean) {
    if (!rec) return
    if (correct) {
      setScore((s) => s + (rec.dirty ? 15 : 10))
      if (!rec.dirty) { seenIds.current.add(rec.id); setLoaded((n) => n + 1) }
      setFlash({ ok: true, msg: rec.dirty ? `rejected: ${rec.dirty}` : 'row loaded' })
    } else {
      const next = strikes + 1
      setStrikes(next)
      setFlash({ ok: false, msg: rec.dirty ? `GRAIN CORRUPTED: ${rec.dirty} hit the warehouse` : 'you rejected a clean row' })
      if (next >= 3) { setOver(true); setRunning(false); return }
    }
    setTimeout(() => setFlash(null), 900)
    nextRecord()
  }

  const act = useCallback((load: boolean) => {
    if (!running || over || !rec) return
    // LOAD is correct when clean; REJECT is correct when dirty
    judge(load ? rec.dirty === null : rec.dirty !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, rec])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') act(true)
      if (e.key === 'ArrowLeft') act(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [act, onClose])

  function start() {
    seenIds.current = new Set()
    setScore(0); setStrikes(0); setLoaded(0); setOver(false); setRunning(true)
    nextRecord()
  }

  const t = tier(score)

  return (
    <motion.div
      role="dialog"
      aria-label="pipeline panic"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.quick, ease: ease.out }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: INK, color: PAPER,
        fontFamily: 'var(--font-mono)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '1.5rem', overflowY: 'auto',
      }}
    >
      <button
        onClick={onClose}
        aria-label="quit pipeline panic"
        style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: '1px solid #555', color: PAPER, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 8px', cursor: 'pointer' }}
      >
        esc to quit ✕
      </button>

      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.8 }}>pipeline panic</div>

      {/* scoreboard */}
      <div className="flex items-center gap-5" style={{ marginTop: 8, fontSize: 11 }}>
        <span>score <span style={{ color: 'var(--vermilion)' }}>{score}</span></span>
        <span>tier <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span></span>
        <span>rows {loaded}</span>
        <span>corruption {'▮'.repeat(strikes)}{'▯'.repeat(Math.max(0, 3 - strikes))}</span>
        <span>lvl {level}</span>
      </div>

      {!running && !over && (
        <div style={{ textAlign: 'center', marginTop: '14vh', maxWidth: 460 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: PAPER }}>you are the staging layer.</div>
          <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.75, marginTop: 12 }}>
            records stream toward the warehouse. <span style={{ color: '#7fc97f' }}>LOAD →</span> the clean ones.{' '}
            <span style={{ color: 'var(--vermilion)' }}>← REJECT</span> the dirty ones: NULLs, duplicate keys, type garbage.
            let nothing slip past you. three corruptions and the monthly close fails.
          </p>
          <button onClick={start} style={{ marginTop: 20, background: 'var(--vermilion)', color: INK, border: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, padding: '10px 28px', cursor: 'pointer', letterSpacing: '0.08em' }}>
            START THE BATCH
          </button>
        </div>
      )}

      {running && rec && (
        <>
          {/* time fuse */}
          <div style={{ width: 'min(80vw, 420px)', height: 4, background: '#333', marginTop: '7vh' }}>
            <div style={{ height: '100%', width: `${timeLeft * 100}%`, background: timeLeft < 0.3 ? 'var(--vermilion)' : '#7fc97f', transition: 'width 60ms linear' }} />
          </div>

          {/* the record card */}
          <div style={{ width: 'min(80vw, 420px)', border: `1px solid ${PAPER}`, background: '#222', marginTop: 10, boxShadow: '6px 6px 0 #000' }}>
            <div style={{ borderBottom: '1px solid #444', padding: '6px 12px', fontSize: 10, opacity: 0.7, display: 'flex', justifyContent: 'space-between' }}>
              <span>incoming record</span><span>stg_inbox</span>
            </div>
            <div style={{ padding: '14px 16px', fontSize: 15, lineHeight: 1.9 }}>
              {'{'}
              {rec.cols.map((c) => (
                <div key={c.k} style={{ paddingLeft: 18 }}>
                  <span style={{ opacity: 0.6 }}>{c.k}:</span>{' '}
                  <span style={{ color: c.v === 'NULL' || c.v.includes('#') || c.v.includes("'") || c.v.includes('"') || c.v.includes('e99') ? 'var(--vermilion)' : PAPER }}>{c.v}</span>
                </div>
              ))}
              {'}'}
            </div>
          </div>

          {/* actions */}
          <div className="flex gap-4" style={{ marginTop: 18 }}>
            <button onClick={() => act(false)} style={{ background: 'none', border: '1.5px solid var(--vermilion)', color: 'var(--vermilion)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, padding: '12px 22px', cursor: 'pointer' }}>
              ← REJECT
            </button>
            <button onClick={() => act(true)} style={{ background: 'none', border: '1.5px solid #7fc97f', color: '#7fc97f', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, padding: '12px 22px', cursor: 'pointer' }}>
              LOAD →
            </button>
          </div>

          <div style={{ minHeight: 22, marginTop: 14, fontSize: 11, color: flash ? (flash.ok ? '#7fc97f' : 'var(--vermilion)') : 'transparent' }}>
            {flash?.msg ?? '.'}
          </div>
        </>
      )}

      {over && (
        <div style={{ textAlign: 'center', marginTop: '12vh', maxWidth: 460 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color: 'var(--vermilion)' }}>the monthly close failed.</div>
          <p style={{ fontSize: 12, lineHeight: 1.8, opacity: 0.8, marginTop: 12 }}>
            final score <span style={{ color: PAPER, fontWeight: 700 }}>{score}</span> · tier{' '}
            <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span> · {loaded} clean rows in the warehouse.
            <br />somewhere, a data engineer gets paged at 6 am. it is you. it was always you.
          </p>
          <div className="flex gap-3 justify-center" style={{ marginTop: 18 }}>
            <button onClick={start} style={{ background: 'var(--vermilion)', color: INK, border: 'none', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, padding: '8px 20px', cursor: 'pointer' }}>
              rerun the batch
            </button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #555', color: PAPER, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '8px 20px', cursor: 'pointer' }}>
              walk away
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: 9, opacity: 0.45, marginTop: 'auto', paddingTop: '1rem' }}>
        ← reject · load → · based on a true story (the day job)
      </div>
    </motion.div>
  )
}
