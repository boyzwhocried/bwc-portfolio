'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-xs px-3 py-1 transition-opacity hover:opacity-70"
      style={{ fontFamily: 'var(--font-mono)', border: '1px solid var(--fg)', color: 'var(--fg)', background: 'transparent', cursor: 'pointer' }}
    >
      print / save as pdf
    </button>
  )
}
