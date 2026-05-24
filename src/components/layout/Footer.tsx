export default function Footer() {
  return (
    <footer
      style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
      className="mt-32 py-8"
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs font-mono">
        <span>boyzwhocried.xyz</span>
        <span>{new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}
