'use client'

import { useEffect, useState } from 'react'
import CrtTerminal from './CrtTerminal'
import DriftingSquares from '@/components/ui/DriftingSquares'
import DarkroomGame from './sandbox/DarkroomGame'
import PipelinePanic from './sandbox/PipelinePanic'
import Guestbook from './sandbox/Guestbook'
import GenerativeCircles from './sandbox/GenerativeCircles'
import FallingSand from './sandbox/FallingSand'
import GravityWell from './sandbox/GravityWell'
import ToneGarden from './sandbox/ToneGarden'
import TheDaily from './sandbox/TheDaily'
import TheRig from './sandbox/TheRig'
import Parry from './sandbox/Parry'

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

export type SandboxApp =
  | 'terminal' | 'darkroom' | 'pipeline' | 'guestbook'
  | 'sand' | 'gravity' | 'tone' | 'daily' | 'rig' | 'parry'
  | null

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--fg)', marginTop: 8, lineHeight: 1.1 }}>
      {children}
    </div>
  )
}

const TAG = { fontFamily: 'var(--font-mono)', fontWeight: 400 as const, fontSize: 9, color: 'var(--accent-text)' }

// a faint section label that groups the shelf into make / play / daily
function Section({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline" style={{ gap: 10, marginBottom: '1.4rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--fg)', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--rule, #d8d2c6)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{note}</span>
      </div>
      <div className="flex flex-wrap items-end gap-x-10 gap-y-12">{children}</div>
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

        {/* the shelf: scattered toy-objects, grouped make / play / daily */}
        <div style={{ marginTop: '2.8rem', display: 'flex', flexDirection: 'column', gap: '2.8rem' }}>

          <Section label="make" note="something from nothing">
            {/* tone garden */}
            <div style={{ transform: 'rotate(-2deg)' }}>
              <button
                onClick={() => setApp('tone')}
                aria-label="open tone garden"
                style={{ display: 'block', width: 130, height: 112, background: '#13161d', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 11 }}
              >
                <span style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} style={{ aspectRatio: '1', borderRadius: 2, background: [2, 7, 9, 14, 16, 21].includes(i) ? '#e84c28' : '#222936' }} />
                  ))}
                </span>
              </button>
              <Caption>tone garden <span style={TAG}>· make a loop</span></Caption>
            </div>

            {/* the terrarium (falling sand) */}
            <div style={{ transform: 'rotate(2.5deg)' }}>
              <button
                onClick={() => setApp('sand')}
                aria-label="open the terrarium"
                style={{ display: 'block', width: 116, height: 120, background: '#1a1714', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 0, position: 'relative', overflow: 'hidden' }}
              >
                <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: '#3b7a82' }} />
                <span style={{ position: 'absolute', bottom: 30, left: 0, right: 0, height: 26, background: '#d8a24a' }} />
                <span style={{ position: 'absolute', top: 10, left: '50%', width: 11, height: 11, background: '#e84c28', transform: 'translateX(-50%)', boxShadow: '0 0 7px #e84c28' }} />
              </button>
              <Caption>the terrarium <span style={TAG}>· paint physics</span></Caption>
            </div>

            {/* the orrery (gravity well) */}
            <div style={{ transform: 'rotate(-3deg)' }}>
              <button
                onClick={() => setApp('gravity')}
                aria-label="open the orrery"
                style={{ display: 'block', width: 116, height: 116, borderRadius: '50%', background: 'radial-gradient(circle,#15151f,#0a0a12)', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                <span style={{ position: 'absolute', top: '50%', left: '50%', width: 70, height: 70, border: '1px solid rgba(207,210,220,0.3)', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
                <span style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 14, background: '#e84c28', borderRadius: '50%', transform: 'translate(-50%,-50%)', boxShadow: '0 0 9px #e84c28' }} />
                <span style={{ position: 'absolute', top: '15%', left: '50%', width: 7, height: 7, background: '#cfd2dc', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
              </button>
              <Caption>the orrery <span style={TAG}>· fling worlds</span></Caption>
            </div>

            {/* generative circles — now actually generative */}
            <div style={{ transform: 'rotate(3deg)' }}>
              <GenerativeCircles />
              <Caption>generative<br />circles <span style={TAG}>· click</span></Caption>
            </div>

            {/* darkroom (film print in a tray) */}
            <div style={{ transform: 'rotate(2deg)' }}>
              <button
                onClick={() => setApp('darkroom')}
                aria-label="enter the darkroom"
                style={{ display: 'block', width: 116, height: 138, background: '#2a0808', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 10, position: 'relative', overflow: 'hidden' }}
              >
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(200,40,25,0.5), transparent 65%)' }} />
                <span style={{ display: 'block', position: 'relative', width: '100%', height: 82, background: '#111', border: '1px solid #5a2020' }} />
                <span style={{ display: 'block', position: 'relative', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#e98', marginTop: 8, textAlign: 'left' }}>
                  develop a real<br />frame · hold
                </span>
              </button>
              <Caption>the darkroom <span style={TAG}>· playable</span></Caption>
            </div>

            {/* CRT, the hero (click to boot) */}
            <div style={{ transform: 'rotate(-1.5deg)' }}>
              <button
                onClick={() => setApp('terminal')}
                style={{ display: 'block', width: 158, height: 126, background: 'var(--ink)', borderRadius: 12, padding: 9, boxShadow: SHADOW, border: 'none', cursor: 'pointer' }}
              >
                <span style={{ display: 'block', position: 'relative', height: '100%', background: '#0a140a', borderRadius: 5, overflow: 'hidden', fontFamily: 'var(--font-mono)', color: '#4af07a', fontSize: 10, textAlign: 'left', padding: 8, textShadow: '0 0 3px #4af07a' }}>
                  bwc.crt<br />&gt; boot_
                  <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(10,20,10,0.35) 2px 4px)' }} />
                </span>
              </button>
              <Caption>CRT-OS <span style={TAG}>· click to boot</span></Caption>
            </div>
          </Section>

          <Section label="play" note="score-chasers & time-wasters">
            {/* PARRY — the arcade */}
            <div style={{ transform: 'rotate(-1.5deg)' }}>
              <button
                onClick={() => setApp('parry')}
                aria-label="play parry"
                style={{ display: 'block', width: 144, height: 116, background: '#0d0f0d', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 0, position: 'relative', overflow: 'hidden' }}
              >
                <span style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 21, letterSpacing: '0.12em', color: '#7CFC9A', textShadow: '0 0 6px #7CFC9A' }}>PARRY</span>
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.4) 2px 3px)' }} />
              </button>
              <Caption>PARRY <span style={TAG}>· arcade · leaderboard</span></Caption>
            </div>

            {/* the rig (calibration) */}
            <div style={{ transform: 'rotate(2deg)' }}>
              <button
                onClick={() => setApp('rig')}
                aria-label="open the rig"
                style={{ display: 'block', width: 116, height: 116, background: '#1b1e21', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                <span style={{ position: 'absolute', bottom: -28, left: '50%', width: 72, height: 72, border: '2px solid #3a4046', borderRadius: '50%', transform: 'translateX(-50%)' }} />
                <span style={{ position: 'absolute', bottom: 16, left: '50%', width: 2, height: 44, background: '#e84c28', transformOrigin: '50% 100%', transform: 'translateX(-50%) rotate(26deg)' }} />
                <span style={{ position: 'absolute', top: 11, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: '#6cf09a' }}>CALIBRATE</span>
              </button>
              <Caption>the rig <span style={TAG}>· train precision</span></Caption>
            </div>

            {/* pipeline panic (medallion stack) */}
            <div style={{ transform: 'rotate(-2.5deg)' }}>
              <button
                onClick={() => setApp('pipeline')}
                aria-label="play pipeline panic"
                style={{ display: 'block', width: 138, height: 128, background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: SHADOW_INK, cursor: 'pointer', padding: 10 }}
              >
                <span style={{ display: 'block', height: 18, background: '#ad6a3e', border: '1px solid var(--ink)' }} />
                <span style={{ display: 'block', height: 18, background: '#9aa0a6', border: '1px solid var(--ink)', marginTop: 5, marginLeft: 8, marginRight: 8 }} />
                <span style={{ display: 'block', height: 18, background: '#c9a227', border: '1px solid var(--ink)', marginTop: 5, marginLeft: 16, marginRight: 16 }} />
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 8, textAlign: 'left' }}>
                  you are the staging layer
                </span>
              </button>
              <Caption>pipeline panic <span style={TAG}>· playable</span></Caption>
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
          </Section>

          <Section label="daily" note="come back tomorrow">
            {/* the daily (code-break) */}
            <div style={{ transform: 'rotate(-2deg)' }}>
              <button
                onClick={() => setApp('daily')}
                aria-label="play the daily"
                style={{ display: 'block', width: 124, height: 112, background: '#efe9dd', border: '1.5px solid var(--ink)', boxShadow: SHADOW, cursor: 'pointer', padding: 11, textAlign: 'left' }}
              >
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', color: '#6b665d' }}>THE DAILY</span>
                <span style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {['#e84c28', '#2f7d86', '#caa23a', '#5a8f4a'].map((c, i) => (
                    <span key={i} style={{ width: 18, height: 18, background: c, border: '1.5px solid var(--ink)', borderRadius: 2 }} />
                  ))}
                </span>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6b665d', marginTop: 12 }}>crack the code</span>
              </button>
              <Caption>the daily <span style={TAG}>· one a day</span></Caption>
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
              <Caption>guestbook <span style={TAG}>· open</span></Caption>
            </div>

            {/* more soon (dashed square) */}
            <div style={{ transform: 'rotate(2deg)' }}>
              <div style={{ width: 96, height: 78, background: '#f1ede4', border: '1.5px dashed #b3ada0', boxShadow: '3px 3px 0 #b3ada0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
                + more soon<br />always growing
              </div>
            </div>
          </Section>
        </div>
      </div>

      {burst && <SquareBurst />}
      {app === 'terminal' && <CrtTerminal onClose={() => setApp(null)} onLaunch={(g) => setApp(g)} />}
      {app === 'darkroom' && <DarkroomGame onClose={() => setApp(null)} />}
      {app === 'pipeline' && <PipelinePanic onClose={() => setApp(null)} />}
      {app === 'guestbook' && <Guestbook onClose={() => setApp(null)} />}
      {app === 'sand' && <FallingSand onClose={() => setApp(null)} />}
      {app === 'gravity' && <GravityWell onClose={() => setApp(null)} />}
      {app === 'tone' && <ToneGarden onClose={() => setApp(null)} />}
      {app === 'daily' && <TheDaily onClose={() => setApp(null)} />}
      {app === 'rig' && <TheRig onClose={() => setApp(null)} />}
      {app === 'parry' && <Parry onClose={() => setApp(null)} />}
    </section>
  )
}
