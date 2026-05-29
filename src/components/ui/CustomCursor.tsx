'use client'

import { useEffect, useRef } from 'react'

const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, [tabindex]:not([tabindex="-1"])'

function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return !!target.closest(INTERACTIVE)
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const raf = useRef<number>(0)

  useEffect(() => {
    const isTouchDevice = window.matchMedia('(hover: none)').matches
    if (isTouchDevice) {
      if (cursorRef.current) cursorRef.current.style.display = 'none'
      return
    }

    function onMove(e: MouseEvent) {
      pos.current = { x: e.clientX, y: e.clientY }
      if (isInteractive(e.target)) {
        cursorRef.current?.classList.add('cursor--hover')
      } else {
        cursorRef.current?.classList.remove('cursor--hover')
      }
    }

    function render() {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
      raf.current = requestAnimationFrame(render)
    }

    window.addEventListener('mousemove', onMove)
    raf.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        willChange: 'transform',
      }}
    >
      <style>{`
        *, *::before, *::after { cursor: none !important; }
        .cursor-inner {
          width: 16px;
          height: 16px;
          margin-left: -8px;
          margin-top: -8px;
          position: relative;
          transition: transform 0.15s ease;
        }
        .cursor-inner::before,
        .cursor-inner::after {
          content: '';
          position: absolute;
          background: var(--fg);
          transition: all 0.15s ease;
        }
        .cursor-inner::before {
          width: 16px;
          height: 1px;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
        }
        .cursor-inner::after {
          width: 1px;
          height: 16px;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
        }
        .cursor--hover .cursor-inner {
          transform: scale(1.8);
        }
      `}</style>
      <div className="cursor-inner" />
    </div>
  )
}
