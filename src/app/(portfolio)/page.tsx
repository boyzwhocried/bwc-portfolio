import { getFeaturedProjects } from '@/lib/projects'
import HomeHero from '@/components/sections/HomeHero'

export const revalidate = 3600

export default async function HomePage() {
  const featured = await getFeaturedProjects()
  return <HomeHero featured={featured} />
}
