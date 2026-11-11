'use client'

import { useState } from 'react'
import { normalizeRoomCode } from '@/lib/sandbox/fighter/net/room'

const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERM = '#e84c28'

export type OnlineView =
  | { kind: 'menu'; error?: string }
  | { kind: 'lobby'; role: 'host' | 'guest'; code: string; connected: boolean }

const wrap: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, background: INK, color: PAPER, zIndex: 4,
}
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', margin: 0, textAlign: 'center' }
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', minHeight: 44, padding: '6px 16px', background: INK, color: PAPER, border: `2px solid ${PAPER}`, cursor: 'pointer',
}
const input: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.3em', textTransform: 'uppercase', width: 140, minHeight: 44, textAlign: 'center', background: INK, color: PAPER, border: `2px solid ${PAPER}`,
}

export default function FighterOnlinePanel({
  view,
  onCreate,
  onJoin,
  onCancel,
}: {
  view: OnlineView
  onCreate: () => void
  onJoin: (code: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const code = normalizeRoomCode(text)

  if (view.kind === 'lobby') {
    return (
      <div style={wrap} role="dialog" aria-label="Online lobby">
        {view.role === 'host' ? (
          <>
            <p style={{ ...mono, fontSize: 11, opacity: 0.8 }}>Room code</p>
            <p style={{ ...mono, fontSize: 30, fontWeight: 700, letterSpacing: '0.3em', color: VERM }} aria-label={'Room code ' + view.code.split('').join(' ')}>{view.code}</p>
            <button
              style={btn}
              onClick={() => {
                void navigator.clipboard?.writeText(view.code).then(() => setCopied(true), () => undefined)
              }}
            >
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <p style={{ ...mono, fontSize: 11 }} role="status">
              {view.connected ? 'Menunggu teman... / Waiting for a friend...' : 'Menyambung... / Connecting...'}
            </p>
            <p style={{ ...mono, fontSize: 11, opacity: 0.8 }}>Kamu Si Penyadap (kiri) / You are Si Penyadap (left)</p>
          </>
        ) : (
          <>
            <p style={{ ...mono, fontSize: 14 }} role="status">Masuk ruang {view.code}... / Joining {view.code}...</p>
            <p style={{ ...mono, fontSize: 11, opacity: 0.8 }}>Kamu Sang Ajudan (kanan) / You are Sang Ajudan (right)</p>
          </>
        )}
        <button style={btn} onClick={onCancel}>CANCEL</button>
      </div>
    )
  }

  return (
    <div style={wrap} role="dialog" aria-label="Play online">
      <h2 style={{ ...mono, fontSize: 14, letterSpacing: '0.08em' }}>PLAY ONLINE</h2>
      <button style={btn} onClick={onCreate} autoFocus>CREATE ROOM</button>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (code) onJoin(code)
        }}
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 8))}
          placeholder="KODE"
          aria-label="Room code"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          style={input}
        />
        <button type="submit" style={{ ...btn, opacity: code ? 1 : 0.5 }} disabled={!code}>JOIN</button>
      </form>
      {view.error && <p style={{ ...mono, fontSize: 11, color: VERM }} role="alert">{view.error}</p>}
      <button style={btn} onClick={onCancel}>BACK</button>
    </div>
  )
}
