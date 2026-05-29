import SpotifyWidget from '@/components/sections/SpotifyWidget'

export default function Footer({ room }: { room: string }) {
  return (
    <footer
      data-room={room}
      style={{ borderTop: '1px solid var(--rule)', color: 'var(--muted)', backgroundColor: 'var(--bg)' }}
      className="mt-32 py-8"
    >
      <div
        className="max-w-5xl mx-auto px-6 flex items-center justify-between gap-6 text-xs"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="min-w-0 flex-1">
          <SpotifyWidget />
        </span>
        <span className="flex-shrink-0">{new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}
