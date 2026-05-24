import { Metadata } from 'next'
import { getAllProjects } from '@/lib/projects'
import ProjectGrid from '@/components/sections/ProjectGrid'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'projects',
  description: "things i've built.",
}

export default async function ProjectsPage() {
  const projects = await getAllProjects()
  return <ProjectGrid projects={projects} />
}
