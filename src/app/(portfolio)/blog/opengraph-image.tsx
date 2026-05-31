import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'writing by boyzwhocried'

export default function Image() {
  return renderOG({
    kicker: 'blog',
    title: 'notes on data, systems, and breaking things.',
    subtitle: 'writing from the workshop.',
  })
}
