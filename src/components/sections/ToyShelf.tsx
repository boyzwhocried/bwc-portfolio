'use client'

import { useEffect, useState } from 'react'
import CrtTerminal from './CrtTerminal'
import DriftingSquares from '@/components/ui/DriftingSquares'
import DarkroomGame from './sandbox/DarkroomGame'
import PipelinePanic from './sandbox/PipelinePanic'
import Guestbook from './sandbox/Guestbook'
import GenerativeCircles from './sandbox/GenerativeCircles'

const SHADOW = '4px 4px 0 #b3ada0'
const SHADOW_INK = '4px 4px 0 var(--ink)'

const USELESS_MSGS = [
  'nothing happened.',
  'still nothing.',
  'you were warned.',
  'this button does not do anything.',
  'ok fine: you have great taste.',
  'achievement unlocked: persistence.',
  'seriously, there is no prize.',
  'two more. i can feel you wavering.',
  'one more.',
  '...fine. you win.',
]

export type SandboxApp = 'terminal' | 'darkroom' | 'pipeline' | 'guestbook' | null

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--fg)', marginTop: 8, lineHeight: 1.1 }}>
      {children}
    </div>
  )
}

// the confetti payoff for the persistent: a one-shot burst of brand squares.
// specs are generated post-mount (random is impure during render).
type BurstSpec = { left: number; delay: number; size: number; spin: number }

function SquareBurst() {
  const [specs, setSpecs] = useState<BurstSpec[]>([])

  useEffect(() => {
    const t0 = setTimeout(() => {
      setSpecs(
        Array.from({ length: 28 }, () => ({
          left: 10 + Math.random() * 80,
          delay: Math.random() * 0.3,
          size: 8 + Math.random() * 14,
          spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
        }))
      )
    }, 0)
    return () => clearTimeout(t0)
  }, [])

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 300 }}>
      {specs.map((s, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', left: `${s.left}%`, top: '-3%',
            width: s.size, height: s.size,
            background: i % 3 === 0 ? 'var(--ink)' : 'var(--vermilion)',
            animation: `bwc-fall 1.6s ${s.delay}s cubic-bezier(0.3,0,0.8,1) forwards`,
            ['--spin' as string]: `${s.spin}deg`,
          }}
        />
      ))}
      <style>{`@keyframes bwc-fall { to { transform: translateY(110vh) rotate(var(--spin)); opacity: 0.9; } }`}</style>
    </div>
  )
}

export default function ToyShelf() {
  const [app, setApp] = useState<SandboxApp>(null)
  const [clicks, setClicks] = useState(0)
  const [burst, setBurst] = useState(false)

  function pressUseless() {
    const next = clicks + 1
    setClicks(next)
    if (next === USELESS_MSGS.length) {
      setBurst(true)
      setTimeout(() => setBurst(false), 2200)
    }
  }

  return (
    <section className="min-h-screen relative overflow-hidden" style={{ paddingTop: '3.5rem' }}>
      <DriftingSquares variant="sandbox" color="var(--vermilion)" opacity={0.1} count={7} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--page-max)', marginLeft: 'auto', marginRight: 'auto', paddingLeft: 'var(--page-px)', paddingRight: 'var(--page-px)', paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(2rem, 5vw, 2.6rem)', letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            the sandbox
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
            everything on this shelf actually runs. go on.
          </p>
        </div>

        {/* the shelf: scattered toy-objects, all clickable */}
        <div className="flex flex-wrap items-end gap-x-10 gap-y-12" style={{ marginTop: '3rem' }}>
          {/* CRT, the hero (click to boot) */}
          <div style={{ transform: 'rotate(-1.5deg)' }}>
            <button
              onClick={() => setApp('terminal')}
              style={{ display: 'block', width: 170, height: 134, background: 'var(--ink)', borderRadius: 12, padding: 9, boxShadow: SHADOW, border: 'none', cursor: 'pointer' }}
            >
              <span style={{ display: 'block', position: 'relative', height: '100%', background: '#0a140a', borderRadius: 5, overflow: 'hidden', fontFamily: 'var(--font-mono)', color: '#4af07a', fontSize: 10, textAlign: 'left', padding: 8, textShadow: '0 0 3px #4af07a' }}>
                bwc.crt<br />&gt; boot_
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(10,20,10,0.35) 2px 4px)' }} />
              </span>
            </button>
            <Caption>CRT-OS <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· click to boot</span></Caption>
          </div>

          {/* darkroom (film print in a tray) */}
          <div style={{ transform: 'rotate(2deg)' }}>
            <button
              onClick={() => setApp('darkroom')}
              aria-label="enter the darkroom"
              style={{ display: 'block', width: 128, height: 150, background: '#2a0808', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 10, position: 'relative', overflow: 'hidden' }}
            >
              <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(200,40,25,0.5), transparent 65%)' }} />
              <span style={{ display: 'block', position: 'relative', width: '100%', height: 92, background: '#111', border: '1px solid #5a2020' }} />
              <span style={{ display: 'block', position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#e98', marginTop: 8, textAlign: 'left' }}>
                develop a real<br />frame · hold to agitate
              </span>
            </button>
            <Caption>the darkroom <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· playable</span></Caption>
          </div>

          {/* pipeline panic (medallion stack) */}
          <div style={{ transform: 'rotate(-2.5deg)' }}>
            <button
              onClick={() => setApp('pipeline')}
              aria-label="play pipeline panic"
              style={{ display: 'block', width: 140, height: 130, background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: SHADOW_INK, cursor: 'pointer', padding: 10 }}
            >
              <span style={{ display: 'block', height: 18, background: '#ad6a3e', border: '1px solid var(--ink)' }} />
              <span style={{ display: 'block', height: 18, background: '#9aa0a6', border: '1px solid var(--ink)', marginTop: 5, marginLeft: 8, marginRight: 8 }} />
              <span style={{ display: 'block', height: 18, background: '#c9a227', border: '1px solid var(--ink)', marginTop: 5, marginLeft: 16, marginRight: 16 }} />
              <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 8, textAlign: 'left' }}>
                you are the staging layer
              </span>
            </button>
            <Caption>pipeline panic <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· playable</span></Caption>
          </div>

          {/* generative circles — now actually generative */}
          <div style={{ transform: 'rotate(3deg)' }}>
            <GenerativeCircles />
            <Caption>generative<br />circles <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· click</span></Caption>
          </div>

          {/* the useless button */}
          <div style={{ transform: 'rotate(-2deg)' }}>
            <button
              onClick={pressUseless}
              style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--vermilion)', border: '1.5px solid var(--ink)', boxShadow: SHADOW_INK, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', textAlign: 'center', lineHeight: 0.9 }}>
                DO<br />NOT
              </span>
            </button>
            <Caption>
              the useless button
              {clicks > 0 && (
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--muted)', marginTop: 3, maxWidth: 120 }}>
                  {USELESS_MSGS[Math.min(clicks, USELESS_MSGS.length) - 1]}
                </div>
              )}
            </Caption>
          </div>

          {/* guestbook — real now */}
          <div style={{ transform: 'rotate(1.5deg)' }}>
            <button
              onClick={() => setApp('guestbook')}
              aria-label="open the guestbook"
              style={{ display: 'block', width: 130, height: 112, background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: SHADOW, padding: 9, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.55, cursor: 'pointer', textAlign: 'left' }}
            >
              ★ leave a mark<br />real entries,<br />real table.<br />&gt; sign it_
            </button>
            <Caption>guestbook <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· open</span></Caption>
          </div>

          {/* more soon (dashed square) */}
          <div style={{ transform: 'rotate(2deg)' }}>
            <div style={{ width: 96, height: 78, background: '#f1ede4', border: '1.5px dashed #b3ada0', boxShadow: '3px 3px 0 #b3ada0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
              + more soon<br />always growing
            </div>
          </div>
        </div>
      </div>

      {burst && <SquareBurst />}
      {app === 'terminal' && <CrtTerminal onClose={() => setApp(null)} onLaunch={(g) => setApp(g)} />}
      {app === 'darkroom' && <DarkroomGame onClose={() => setApp(null)} />}
      {app === 'pipeline' && <PipelinePanic onClose={() => setApp(null)} />}
      {app === 'guestbook' && <Guestbook onClose={() => setApp(null)} />}
    </section>
  )
}
