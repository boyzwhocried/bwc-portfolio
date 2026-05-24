import { getFeaturedProjects } from '@/lib/projects'
import Hero from '@/components/sections/Hero'

export const revalidate = 3600

export default async function HomePage() {
  const featuredProjects = await getFeaturedProjects()
  return <Hero featuredProjects={featuredProjects} />
}
