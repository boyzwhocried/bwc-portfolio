import { createServerClient } from '@/lib/supabase/server'
import { Project } from '@/types'
import Hero from '@/components/sections/Hero'

export const revalidate = 3600

export default async function HomePage() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('featured', true)
    .order('order', { ascending: true })

  const featuredProjects = (data ?? []) as Project[]

  return <Hero featuredProjects={featuredProjects} />
}
