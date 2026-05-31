import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'what boyzwhocried is listening to'

export default function Image() {
  return renderOG({
    kicker: 'music',
    title: "what's spinning, live from spotify.",
    subtitle: 'now playing, top tracks, and the playlists i live in.',
  })
}
