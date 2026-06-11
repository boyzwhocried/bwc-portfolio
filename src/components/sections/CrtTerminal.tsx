'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ease, dur } from '@/lib/motion'

const BOOT = [
  '$ booting bwc.os ...',
  '[ ok ] phosphor display online',
  '[ ok ] mounting /projects /blog /music',
  '[ ok ] coffee subsystem: critical',
  '$ ready. type `help`.',
]

const HELP = [
  'commands:',
  '  help · about · whoami · neofetch',
  '  ls · open <room>        rooms: projects blog music photography now hub cv',
  '  play <game>             games: darkroom · pipeline',
  '  guestbook · clear · exit',
]

const NEOFETCH = [
  '       ▄▄▄▄        guest@bwc.os',
  '   ▄▄█▀▀▀▀█▄▄      -------------',
  '  ██  bwc   ██     os: bwc.os (paper edition)',
  '  ██▄      ▄██     host: a corner of the internet, jakarta',
  '   ▀▀█▄▄▄▄█▀▀      uptime: since 2024, with naps',
  '       ▀▀▀▀        shell: this one',
  '                   theme: ink / paper / vermilion',
  '                   cpu: one data engineer, mostly caffeinated',
]

const ROOMS = ['projects', 'blog', 'music', 'photography', 'now', 'hub', 'cv', 'about', 'contact']

type RunResult = { lines: string[]; nav?: string; launch?: 'darkroom' | 'pipeline' | 'guestbook' }

function run(cmd: string): RunResult {
  const c = cmd.trim().toLowerCase()
  if (!c) return { lines: [] }
  const [head, ...rest] = c.split(/\s+/)
  const arg = rest.join(' ')

  switch (head) {
    case 'help': return { lines: HELP }
    case 'about': return { lines: ['boyzwhocried. data engineer in jakarta.', 'you found the terminal. nicely done.'] }
    case 'ls': {
      if (arg === 'secrets' || arg === 'secrets/') return { lines: ['nice try.'] }
      return { lines: ['projects/   blog/   music/   photography/   now/   hub/   cv/   secrets/'] }
    }
    case 'whoami': return { lines: ['guest@bwc.os'] }
    case 'neofetch': return { lines: NEOFETCH }
    case 'projects': return { lines: ['personal-os   vault-of-frights   strata   pulse   greywater-falls   undangin   dwh-ssot'] }
    case 'open':
    case 'cd': {
      if (!arg) return { lines: ['open what? rooms: ' + ROOMS.join(' ')] }
      if (arg === 'secrets' || arg === 'secrets/') return { lines: ['nice try.'] }
      const room = arg.replace(/\/$/, '')
      if (ROOMS.includes(room)) return { lines: [`opening /${room} …`], nav: `/${room}` }
      return { lines: [`no such room: ${room}`] }
    }
    case 'play': {
      if (arg === 'darkroom') return { lines: ['turning off the lights …'], launch: 'darkroom' }
      if (arg === 'pipeline' || arg === 'pipeline-panic') return { lines: ['spinning up the batch …'], launch: 'pipeline' }
      return { lines: ['games: darkroom · pipeline'] }
    }
    case 'guestbook': return { lines: ['fetching the wall …'], launch: 'guestbook' }
    case 'cat': {
      if (arg.includes('secret')) return { lines: ['nice try.'] }
      return { lines: [`cat: ${arg || 'what?'}: no such file`] }
    }
    case 'sudo': return { lines: ['this incident will be reported.'] }
    case 'rm': return { lines: ['absolutely not.'] }
    case 'vim': return { lines: ['you may never leave. (kidding. we only have this shell.)'] }
    case 'clear': return { lines: ['__CLEAR__'] }
    case 'exit': return { lines: ['__EXIT__'] }
    default: return { lines: [`command not found: ${c}. try \`help\`.`] }
  }
}

export default function CrtTerminal({
  onClose,
  onLaunch,
}: {
  onClose: () => void
  onLaunch?: (game: 'darkroom' | 'pipeline' | 'guestbook') => void
}) {
  const reduce = useReducedMotion()
  const [lines, setLines] = useState<string[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // boot reveal: staggered when motion allowed, instant under reduced-motion
  useEffect(() => {
    if (reduce) {
      // deferred so it is not a sync setState in the effect body
      const t0 = setTimeout(() => setLines(BOOT), 0)
      return () => clearTimeout(t0)
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
    if (out.lines[0] === '__EXIT__') { onClose(); return }
    if (out.lines[0] === '__CLEAR__') { setLines([]); setInput(''); return }
    setLines((prev) => [...prev, `> ${input}`, ...out.lines])
    setInput('')
    if (out.nav) {
      setTimeout(() => { window.location.assign(out.nav!) }, 450)
    }
    if (out.launch && onLaunch) {
      setTimeout(() => onLaunch(out.launch!), 450)
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-label="bwc.os terminal"
      onClick={() => inputRef.current?.focus()}
      initial={reduce ? false : { opacity: 0, scaleY: 0.6, filter: 'brightness(2.5)' }}
      animate={{ opacity: 1, scaleY: 1, filter: 'brightness(1)' }}
      transition={{ duration: dur.quick, ease: ease.out }}
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
        transformOrigin: 'center',
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
        <div style={{ opacity: 0.85, marginBottom: 8 }}>bwc.crt · phosphor terminal</div>
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
    </motion.div>
  )
}
