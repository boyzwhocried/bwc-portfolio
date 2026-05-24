'use client'

import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100 })
  const raf = useRef<number>(0)

  useEffect(() => {
    const isTouchDevice = window.matchMedia('(hover: none)').matches
    if (isTouchDevice) return

    document.body.style.cursor = 'none'

    function onMove(e: MouseEvent) {
      pos.current = { x: e.clientX, y: e.clientY }
    }

    function render() {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`
      }
      raf.current = requestAnimationFrame(render)
    }

    function onEnterLink() {
      cursorRef.current?.classList.add('cursor--hover')
    }
    function onLeaveLink() {
      cursorRef.current?.classList.remove('cursor--hover')
    }

    window.addEventListener('mousemove', onMove)
    raf.current = requestAnimationFrame(render)

    const links = document.querySelectorAll('a, button, [role="button"]')
    links.forEach((el) => {
      el.addEventListener('mouseenter', onEnterLink)
      el.addEventListener('mouseleave', onLeaveLink)
    })

    return () => {
      document.body.style.cursor = ''
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
        mixBlendMode: 'difference',
        willChange: 'transform',
      }}
    >
      <style>{`
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
          background: #f5f5f0;
          transition: all 0.15s ease;
        }
        /* horizontal line */
        .cursor-inner::before {
          width: 16px;
          height: 1px;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
        }
        /* vertical line */
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
        .cursor--hover .cursor-inner::before,
        .cursor--hover .cursor-inner::after {
          background: #ffffff;
        }
      `}</style>
      <div className="cursor-inner" />
    </div>
  )
}
