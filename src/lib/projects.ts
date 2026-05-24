import { createServerClient } from '@/lib/supabase/server'
import { Project } from '@/types'

export async function getAllProjects(): Promise<Project[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('order', { ascending: true })

  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)
  return data as Project[]
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data as Project
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('featured', true)
    .order('order', { ascending: true })

  if (error) throw new Error(`Failed to fetch featured projects: ${error.message}`)
  return data as Project[]
}
