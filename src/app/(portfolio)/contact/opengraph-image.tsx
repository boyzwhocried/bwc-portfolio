import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'contact boyzwhocried'

export default function Image() {
  return renderOG({
    kicker: 'contact',
    title: "let's build something. or just say hi.",
    subtitle: 'open to interesting problems and good conversations.',
  })
}
