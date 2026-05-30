'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const BOOT = [
  '$ booting bwc.os ...',
  '[ ok ] phosphor display online',
  '[ ok ] mounting /projects /blog /music',
  '[ ok ] coffee subsystem: critical',
  '$ ready. type `help`.',
]

const HELP = 'commands: help · about · ls · whoami · projects · clear · exit'

function run(cmd: string): string[] {
  const c = cmd.trim().toLowerCase()
  if (!c) return []
  switch (c) {
    case 'help': return [HELP]
    case 'about': return ['boyzwhocried. data engineer in jakarta.', 'you found the terminal. nicely done.']
    case 'ls': return ['projects/   blog/   music/   about/   secrets/']
    case 'whoami': return ['guest@bwc.os']
    case 'projects': return ['personal-os   vault-of-frights   outreach-os   undangin   dwh-ssot']
    case 'cd secrets':
    case 'ls secrets':
    case 'cat secrets': return ['nice try.']
    case 'sudo': return ['this incident will be reported.']
    case 'clear': return ['__CLEAR__']
    case 'exit': return ['__EXIT__']
    default: return [`command not found: ${c}. try \`help\`.`]
  }
}

export default function CrtTerminal({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion()
  const [lines, setLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // boot reveal: staggered when motion allowed, instant under reduced-motion
  useEffect(() => {
    if (reduce) {
      setLines(BOOT)
      return
    }
    let i = 0
    const t = setInterval(() => {
      i += 1
      setLines(BOOT.slice(0, i))
      if (i >= BOOT.length) clearInterval(t)
    }, 320)
    return () => clearInterval(t)
  }, [reduce])

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [lines])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const out = run(input)
    if (out[0] === '__EXIT__') { onClose(); return }
    if (out[0] === '__CLEAR__') { setLines([]); setInput(''); return }
    setLines((prev) => [...prev, `> ${input}`, ...out])
    setInput('')
  }

  return (
    <div
      role="dialog"
      aria-label="bwc.os terminal"
      onClick={() => inputRef.current?.focus()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: '#0a140a',
        color: '#4af07a',
        fontFamily: 'var(--font-mono)',
        fontSize: 14,
        textShadow: '0 0 4px #4af07a88',
        padding: '2rem clamp(1rem, 5vw, 4rem)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
      }}
    >
      {/* scanlines */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent 0 2px, rgba(10,20,10,0.4) 2px 4px)',
        }}
      />

      {/* close affordance */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="close terminal"
        style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: '1px solid #4af07a', color: '#4af07a', fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 8px', cursor: 'pointer', zIndex: 1 }}
      >
        esc to exit ✕
      </button>

      <div ref={scrollRef} style={{ position: 'relative', flex: 1, overflowY: 'auto', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        <div style={{ opacity: 0.85, marginBottom: 8 }}>bwc.crt — phosphor terminal</div>
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <span>&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="terminal input"
            spellCheck={false}
            autoComplete="off"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#4af07a', fontFamily: 'var(--font-mono)', fontSize: 14, textShadow: '0 0 4px #4af07a88' }}
          />
        </form>
      </div>
    </div>
  )
}
