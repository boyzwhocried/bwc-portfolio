'use client'

import { useState } from 'react'
import CrtTerminal from './CrtTerminal'
import DriftingSquares from '@/components/ui/DriftingSquares'

const SHADOW = '4px 4px 0 #b3ada0'
const SHADOW_INK = '4px 4px 0 var(--ink)'

const USELESS_MSGS = [
  'nothing happened.',
  'still nothing.',
  'you were warned.',
  'this button does not do anything.',
  'ok fine: you have great taste.',
  'achievement unlocked: persistence.',
]

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: 'var(--fg)', marginTop: 8, lineHeight: 1.1 }}>
      {children}
    </div>
  )
}

export default function ToyShelf() {
  const [booted, setBooted] = useState(false)
  const [clicks, setClicks] = useState(0)

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
            things i build to learn, break &amp; mess around with
          </p>
        </div>

        {/* the shelf: scattered flat toy-objects, varied shapes + subtle tilt */}
        <div className="flex flex-wrap items-end gap-x-10 gap-y-12" style={{ marginTop: '3rem' }}>
          {/* CRT, the hero (click to boot) */}
          <div style={{ transform: 'rotate(-1.5deg)' }}>
            <button
              onClick={() => setBooted(true)}
              style={{ display: 'block', width: 170, height: 134, background: 'var(--ink)', borderRadius: 12, padding: 9, boxShadow: SHADOW, border: 'none', cursor: 'pointer' }}
            >
              <span style={{ display: 'block', position: 'relative', height: '100%', background: '#0a140a', borderRadius: 5, overflow: 'hidden', fontFamily: 'var(--font-mono)', color: '#4af07a', fontSize: 10, textAlign: 'left', padding: 8, textShadow: '0 0 3px #4af07a' }}>
                bwc.crt<br />&gt; boot_
                <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(10,20,10,0.35) 2px 4px)' }} />
              </span>
            </button>
            <Caption>CRT-OS <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--accent-text)' }}>· click to boot</span></Caption>
          </div>

          {/* generative circles (circle object) */}
          <div style={{ transform: 'rotate(3deg)' }}>
            <div style={{ width: 110, height: 110, borderRadius: '50%', background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: SHADOW, overflow: 'hidden' }}>
              <svg width="100%" height="100%" aria-hidden>
                <circle cx="42%" cy="46%" r="16" fill="none" stroke="var(--vermilion)" strokeWidth="1.5" />
                <circle cx="60%" cy="58%" r="26" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
                <circle cx="66%" cy="38%" r="9" fill="var(--vermilion)" />
              </svg>
            </div>
            <Caption>generative<br />circles</Caption>
          </div>

          {/* the useless button (flat vermilion circle) */}
          <div style={{ transform: 'rotate(-2deg)' }}>
            <button
              onClick={() => setClicks((c) => c + 1)}
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

          {/* guestbook (note shape) */}
          <div style={{ transform: 'rotate(1.5deg)' }}>
            <div style={{ width: 130, height: 112, background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: SHADOW, padding: 9, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.55 }}>
              ★ leave a mark<br />&quot;was here -mira&quot;<br />&quot;cool site!! -d&quot;<br />&gt; soon_
            </div>
            <Caption>guestbook <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 9, color: 'var(--muted)' }}>· soon</span></Caption>
          </div>

          {/* WIP square */}
          <div style={{ transform: 'rotate(-2deg)' }}>
            <div style={{ width: 96, height: 78, background: '#f1ede4', border: '1.5px solid var(--ink)', boxShadow: '3px 3px 0 #b3ada0', padding: 8, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.4 }}>
              playing with:<br />webgl shaders
            </div>
            <Caption>wip</Caption>
          </div>

          {/* more soon (dashed square) */}
          <div style={{ transform: 'rotate(2deg)' }}>
            <div style={{ width: 96, height: 78, background: '#f1ede4', border: '1.5px dashed #b3ada0', boxShadow: '3px 3px 0 #b3ada0', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
              + more soon<br />always growing
            </div>
          </div>
        </div>
      </div>

      {booted && <CrtTerminal onClose={() => setBooted(false)} />}
    </section>
  )
}
