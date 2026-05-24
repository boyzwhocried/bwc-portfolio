'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="font-mono text-xs px-3 py-1 transition-opacity hover:opacity-70"
      style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
    >
      print / save as pdf
    </button>
  )
}
