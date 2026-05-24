'use client'

import { useActionState } from 'react'
import { submitContact, ContactFormState } from '@/actions/contact'

const initialState: ContactFormState = { success: false, error: null }

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialState)

  if (state.success) {
    return (
      <p className="font-mono text-sm" style={{ color: 'var(--accent)' }}>
        Message sent. I&apos;ll get back to you.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>
          {state.error}
        </p>
      )}
      <div>
        <label
          htmlFor="name"
          className="block font-mono text-xs mb-2 uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full bg-transparent px-0 py-2 text-sm outline-none"
          style={{
            color: 'var(--fg)',
            borderBottom: '1px solid var(--border)',
          }}
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block font-mono text-xs mb-2 uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full bg-transparent px-0 py-2 text-sm outline-none"
          style={{
            color: 'var(--fg)',
            borderBottom: '1px solid var(--border)',
          }}
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="block font-mono text-xs mb-2 uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full bg-transparent px-0 py-2 text-sm outline-none resize-none"
          style={{
            color: 'var(--fg)',
            borderBottom: '1px solid var(--border)',
          }}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="font-mono text-sm uppercase tracking-widest px-6 py-2 transition-opacity disabled:opacity-40"
        style={{
          border: '1px solid var(--fg)',
          color: 'var(--fg)',
        }}
      >
        {pending ? 'Sending...' : 'Send'}
      </button>
    </form>
  )
}
