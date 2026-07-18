import { getProjectBySlug } from '@/lib/projects'
import { ogContentType, ogSize, renderOG } from '@/lib/og'

export const size = ogSize
export const contentType = ogContentType

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  return renderOG({
    kicker: 'project',
    title: project?.title ?? 'from the workbench.',
    subtitle: project?.description ?? 'systems, tools, and experiments by boyzwhocried.',
  })
}
