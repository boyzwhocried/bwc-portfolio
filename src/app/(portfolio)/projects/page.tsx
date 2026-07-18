import { getAllProjects } from '@/lib/projects'
import ProjectIndex from '@/components/sections/ProjectIndex'
import { pageMetadata } from '@/lib/metadata'

export const revalidate = 3600

export const metadata = pageMetadata({
  title: 'projects',
  description: 'selected work, presented as an index. a data engineer organizes information well.',
  path: '/projects', image: '/projects/opengraph-image',
})

export default async function ProjectsPage() {
  const projects = await getAllProjects()
  // featured pinned to top, then by order (not strict chronological)
  const sorted = [...projects].sort(
    (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.order - b.order,
  )
  return <ProjectIndex projects={sorted} />
}
