import SpotifyWidget from '@/components/sections/SpotifyWidget'

export default function Footer() {
  return (
    <footer
      style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
      className="mt-32 py-8"
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between gap-6 text-xs font-mono">
        <span className="min-w-0 flex-1">
          <SpotifyWidget />
        </span>
        <span className="flex-shrink-0">{new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}
