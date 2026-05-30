'use client'

import { useActionState, useState } from 'react'
import { submitContact, ContactFormState } from '@/actions/contact'

const initialState: ContactFormState = { success: false, error: null }

const INTENTS = ['work together', 'say hi', 'report a bug', 'just chat'] as const

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialState)
  const [intent, setIntent] = useState<string>('')

  if (state.success) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg)' }}>
        sent. i&apos;ll get back to you.
      </p>
    )
  }

  // ink-on-vermilion field styling
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    padding: '0.5rem 0',
    fontSize: 14,
    color: 'var(--fg)',
    borderBottom: '1px solid var(--fg)',
    // no outline:none — keyboard focus ring (global :focus-visible) must stay visible
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    color: 'var(--fg)', // full ink for AA contrast on the vermilion flood
  }

  return (
    <div>
      {/* fill-in-the-blank sentence (the entry gesture) */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 'clamp(1.8rem, 6vw, 3.2rem)',
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        hey verrel, i want to{' '}
        <span style={{ borderBottom: '3px solid var(--fg)', paddingBottom: 2 }}>
          {intent || '______'}
        </span>
        .
      </p>

      {/* intent chips */}
      <div className="flex flex-wrap gap-2" style={{ marginTop: '1.5rem' }}>
        {INTENTS.map((opt) => {
          const selected = intent === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setIntent(selected ? '' : opt)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '6px 12px',
                border: '1px solid var(--fg)',
                background: selected ? 'var(--fg)' : 'transparent',
                color: selected ? 'var(--bg)' : 'var(--fg)',
                cursor: 'pointer',
                transition: 'background .15s ease, color .15s ease',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>

      {/* the working form (writes to Supabase contact_messages) */}
      <form action={action} style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '34rem' }}>
        <input type="hidden" name="intent" value={intent} />
        {state.error && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)', fontWeight: 700 }}>
            {state.error}
          </p>
        )}
        <div>
          <label htmlFor="name" style={labelStyle}>name</label>
          <input id="name" name="name" type="text" required style={fieldStyle} />
        </div>
        <div>
          <label htmlFor="email" style={labelStyle}>email</label>
          <input id="email" name="email" type="email" required style={fieldStyle} />
        </div>
        <div>
          <label htmlFor="message" style={labelStyle}>message</label>
          <textarea id="message" name="message" required rows={4} style={{ ...fieldStyle, resize: 'none' }} />
        </div>
        <button
          type="submit"
          disabled={pending}
          style={{
            alignSelf: 'flex-start',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            padding: '0.6rem 1.5rem',
            border: '1px solid var(--fg)',
            background: 'var(--fg)',
            color: 'var(--bg)',
            cursor: pending ? 'default' : 'pointer',
            opacity: pending ? 0.5 : 1,
          }}
        >
          {pending ? 'sending...' : 'send it'}
        </button>
      </form>
    </div>
  )
}
