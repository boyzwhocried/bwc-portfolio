import { ogSize, ogContentType, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType
export const alt = 'projects by boyzwhocried'

export default function Image() {
  return renderOG({
    kicker: 'projects',
    title: 'things i built to scratch my own itch.',
    subtitle: 'pipelines, dashboards, bots, and the occasional experiment.',
  })
}
