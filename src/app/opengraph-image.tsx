import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'boyzwhocried, data engineer in jakarta'

export default function Image() {
  return renderOG({
    kicker: 'boyzwhocried',
    title: 'i build things & break a few.',
    subtitle: 'data engineer in jakarta. a playground and a workshop.',
  })
}
