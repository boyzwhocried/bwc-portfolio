'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// run the splash setup before paint on the client (so the overlay never paints
// in its untransformed state), but fall back to useEffect on the server to avoid
// the SSR useLayoutEffect warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const T = { rollerIn: 780, hold: 500, morph: 1050, vermZoom: 1300, paperFade: 670 }
const EASE_OUT = 'cubic-bezier(0.16,1,0.3,1)'
const EASE_INOUT = 'cubic-bezier(0.65,0,0.35,1)'
const START_TILT = 3
const LAND_TILT = -2
const VERM_DELAY = 140
const VERM_ROTATE = 90
const VERM_MID_PX = 120

export default function SplashOverlay() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const vermRef = useRef<HTMLDivElement>(null)
  const markInnerRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<SVGTextElement>(null)

  useEffect(() => {
    if (pathname !== '/') return
    if (document.documentElement.dataset.splash !== 'play') return
    setActive(true)
  }, [pathname])

  useIsoLayoutEffect(() => {
    if (!active) return
    let cancelled = false
    const running: Animation[] = []
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const navsq = document.getElementById('nav-square')!
    const verm = vermRef.current!
    const markInner = markInnerRef.current!
    const paper = paperRef.current!

    // synchronous pre-paint setup: place + scale the overlay into its initial
    // keyframe BEFORE the browser paints, so the verm square never paints small
    // then jumps to full-screen (that small->huge change registers as a 1.0 CLS).
    navsq.style.opacity = '0'
    document.documentElement.dataset.splash = 'running'
    const nr = navsq.getBoundingClientRect()
    const vw = window.innerWidth, vh = window.innerHeight
    const baseLeft = (vw - nr.width) / 2
    const baseTop = (vh - nr.height) / 2
    verm.style.left = baseLeft + 'px'
    verm.style.top = baseTop + 'px'
    verm.style.width = nr.width + 'px'
    verm.style.height = nr.height + 'px'
    verm.style.transformOrigin = 'center'
    const vdx = nr.left - baseLeft
    const vdy = nr.top - baseTop
    const cover = (Math.hypot(vw, vh) * 1.1) / nr.width
    const midScale = VERM_MID_PX / nr.width
    verm.style.transform = `translate(0px,0px) scale(${cover}) rotate(${VERM_ROTATE}deg)`
    markInner.style.transform = `rotate(${START_TILT}deg)`
    markInner.style.clipPath = 'inset(0 100% 0 0)'

    // hide the real hero mark for the whole splash, so the flying splash mark is
    // the only "bwc" on screen (no duplicate). it is cross-faded back in at dock.
    const heroMark = document.getElementById('hero-mark')
    if (heroMark) heroMark.style.opacity = '0'

    // FLIP onto the real hero mark by matching CENTERS (rotation-invariant, so the
    // hero's -2deg tilt does not throw off the landing the way top-left alignment did).
    function flipToHero(): string {
      const inner = markInnerRef.current!
      const prev = inner.style.transform
      inner.style.transform = 'none'
      const m0 = inner.getBoundingClientRect()
      inner.style.transform = prev
      const hero = document.getElementById('hero-mark')!.getBoundingClientRect()
      const dx = (hero.left + hero.width / 2) - (m0.left + m0.width / 2)
      const dy = (hero.top + hero.height / 2) - (m0.top + m0.height / 2)
      const s = hero.width / m0.width
      return `translate(${dx}px, ${dy}px) rotate(${LAND_TILT}deg) scale(${s})`
    }

    async function play() {
      await document.fonts.ready
      if (cancelled) return

      running.push(markInner.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0%)' }],
        { duration: T.rollerIn, easing: EASE_OUT, fill: 'both' },
      ))
      await wait(T.rollerIn); if (cancelled) return

      await wait(T.hold); if (cancelled) return

      const heroTransform = flipToHero()
      running.push(markInner.animate(
        [{ transform: `rotate(${START_TILT}deg)` }, { transform: heroTransform }],
        { duration: T.morph, easing: EASE_OUT, fill: 'forwards' },
      ))
      running.push(verm.animate(
        [
          { transform: `translate(0px,0px) scale(${cover}) rotate(${VERM_ROTATE}deg)`, offset: 0, easing: EASE_OUT },
          { transform: `translate(0px,0px) scale(${midScale}) rotate(${VERM_ROTATE / 2}deg)`, offset: 0.5, easing: EASE_INOUT },
          { transform: `translate(${vdx}px,${vdy}px) scale(1) rotate(0deg)`, offset: 1 },
        ],
        { duration: T.vermZoom, delay: VERM_DELAY, fill: 'both' },
      ))
      running.push(paper.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: T.paperFade, delay: T.morph - T.paperFade, easing: 'ease-out', fill: 'forwards' },
      ))
      await wait(Math.max(T.morph, VERM_DELAY + T.vermZoom)); if (cancelled) return

      // dock + handoff: reveal the real nav icon + cross-fade the real hero mark
      // back in while the splash mark fades out (masks any sub-pixel FLIP mismatch),
      // then unmount the splash.
      navsq.style.opacity = '1'
      if (heroMark) { heroMark.style.transition = 'opacity 0.25s ease'; heroMark.style.opacity = '1' }
      running.push(markInner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: 'ease', fill: 'forwards' }))
      await wait(260); if (cancelled) return

      sessionStorage.setItem('bwc-splash-seen', '1')
      document.documentElement.dataset.splash = 'done'
      setActive(false)
    }

    play()
    return () => {
      cancelled = true
      running.forEach((a) => a.cancel())
      document.documentElement.dataset.splash = 'done'
      const navsq = document.getElementById('nav-square')
      if (navsq) navsq.style.opacity = '1'
      const heroMark = document.getElementById('hero-mark')
      if (heroMark) { heroMark.style.opacity = '1'; heroMark.style.transition = '' }
    }
  }, [active])

  if (!active) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden', pointerEvents: 'none' }}>
      <div ref={vermRef} style={{ position: 'fixed', width: 13, height: 13, background: 'var(--vermilion)', transformOrigin: 'center' }} />
      <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <div ref={markInnerRef} style={{ transformOrigin: 'center' }}>
          <svg viewBox="0 0 600 200" style={{ display: 'block', width: 'min(58vw, 760px)', height: 'auto' }}>
            <defs>
              <mask id="splash-knock">
                <rect x="0" y="0" width="600" height="200" fill="#fff" />
                <text x="300" y="158" textAnchor="middle" fontFamily="'Clash Grotesk', sans-serif" fontWeight="700" fontSize="190" letterSpacing="-11" fill="#000">bwc</text>
              </mask>
            </defs>
            <rect x="0" y="0" width="600" height="200" fill="#1a1a1a" mask="url(#splash-knock)" />
            <text ref={paperRef} x="300" y="158" textAnchor="middle" fontFamily="'Clash Grotesk', sans-serif" fontWeight="700" fontSize="190" letterSpacing="-11" fill="#ece7de" opacity="0">bwc</text>
          </svg>
        </div>
      </div>
    </div>
  )
}
