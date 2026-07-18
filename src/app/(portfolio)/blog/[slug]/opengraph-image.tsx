import { getBlogPostWithContent } from '@/lib/mdx'
import { ogContentType, ogSize, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPostWithContent(slug)
  return renderOG({
    kicker: 'built & broken',
    title: post?.title ?? 'writing from the workshop.',
    subtitle: post?.summary ?? 'notes on data, systems, and small experiments.',
  })
}
