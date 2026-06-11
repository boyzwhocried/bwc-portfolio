'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { createBrowserClient } from '@/lib/supabase/browser'
import { ease, dur } from '@/lib/motion'

// the guestbook, for real this time. anon insert is length-bounded by DB
// CHECK constraints + RLS; the honeypot field eats naive bots.
type Entry = { id: string; created_at: string; name: string; message: string }

const PAPER = '#f1ede4'
const INK = '#1a1a1a'

export default function Guestbook({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion()
  const [entries, setEntries] = useState<Entry[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [honey, setHoney] = useState('') // bots fill this; humans never see it
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase
      .from('guestbook')
      .select('id, created_at, name, message')
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => setEntries((data as Entry[]) ?? []))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function sign(e: React.FormEvent) {
    e.preventDefault()
    if (honey) { setState('sent'); return } // pretend success for bots
    const n = name.trim().slice(0, 24)
    const m = message.trim().slice(0, 140)
    if (!n || !m) return
    setState('sending')
    const supabase = createBrowserClient()
    const { data, error } = await supabase
      .from('guestbook')
      .insert({ name: n, message: m } as never)
      .select('id, created_at, name, message')
      .single()
    if (error) { setState('error'); return }
    setEntries((prev) => [data as Entry, ...prev])
    setName(''); setMessage(''); setState('sent')
    setTimeout(() => setState('idle'), 2500)
  }

  return (
    <motion.div
      role="dialog"
      aria-label="guestbook"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.quick, ease: ease.out }}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(26,26,26,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(92vw, 460px)', maxHeight: '84vh', display: 'flex', flexDirection: 'column', background: PAPER, border: `1.5px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}` }}
      >
        <div className="flex items-center justify-between" style={{ borderBottom: `1px solid ${INK}`, padding: '8px 14px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: INK }}>★ the guestbook</span>
          <button onClick={onClose} aria-label="close guestbook" style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', color: INK }}>✕</button>
        </div>

        {/* sign it */}
        <form onSubmit={sign} style={{ borderBottom: `1px solid #d8d2c6`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              placeholder="name"
              aria-label="your name"
              style={{ width: 120, background: '#fff', border: `1px solid ${INK}`, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: INK }}
            />
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={140}
              required
              placeholder="leave a mark (140 max)"
              aria-label="your message"
              style={{ flex: 1, background: '#fff', border: `1px solid ${INK}`, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, color: INK }}
            />
          </div>
          {/* honeypot: visually hidden, real users never fill it */}
          <input
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
          />
          <button
            type="submit"
            disabled={state === 'sending'}
            style={{ alignSelf: 'flex-end', background: 'var(--vermilion)', color: INK, border: `1px solid ${INK}`, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, padding: '6px 16px', cursor: 'pointer', letterSpacing: '0.06em' }}
          >
            {state === 'sending' ? 'signing…' : state === 'sent' ? 'signed ★' : state === 'error' ? 'try again?' : 'SIGN'}
          </button>
        </form>

        {/* the wall */}
        <div style={{ overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.length === 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#6b665d', padding: '12px 0' }}>
              nobody has signed yet. the wall is yours.
            </div>
          )}
          {entries.map((en) => (
            <div key={en.id} style={{ borderBottom: '1px solid #d8d2c6', paddingBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: INK, lineHeight: 1.5 }}>&quot;{en.message}&quot;</div>
              <div className="flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6b665d', marginTop: 3 }}>
                <span>— {en.name}</span>
                <span>{new Date(en.created_at).toISOString().slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
