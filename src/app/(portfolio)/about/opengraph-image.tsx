import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'about boyzwhocried'

export default function Image() {
  return renderOG({
    kicker: 'about',
    title: 'the guy who automates things nobody asked him to.',
    subtitle: 'data engineer in jakarta. a profile.',
  })
}
