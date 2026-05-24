import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllProjects, getProjectBySlug } from '@/lib/projects'

export const revalidate = 3600

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Not Found' }
  return {
    title: project.title,
    description: project.description,
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  return (
    <div data-theme="mono" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <Link
          href="/projects"
          className="font-mono text-xs"
          style={{ color: 'var(--muted)' }}
        >
          ← Projects
        </Link>

        <h1
          className="text-4xl font-black tracking-tight mt-8 mb-4"
          style={{ color: 'var(--fg)' }}
        >
          {project.title}
        </h1>
        <p className="text-base mb-8" style={{ color: 'var(--muted)' }}>
          {project.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {project.tech_stack.map((tech) => (
            <span
              key={tech}
              className="font-mono text-xs px-2 py-0.5"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="flex gap-6 font-mono text-sm">
          {project.live_url && (
            <a
              href={project.live_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              Live ↗
            </a>
          )}
          {project.github_url && (
            <a
              href={project.github_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              GitHub ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
