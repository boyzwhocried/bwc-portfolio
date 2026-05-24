import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import FadeIn from '@/components/ui/FadeIn'
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

  const statusColor =
    project.status === 'active'
      ? 'var(--accent)'
      : project.status === 'archived'
      ? 'var(--muted)'
      : 'var(--fg)'

  return (
    <div data-theme="mono" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">

        <FadeIn>
          <Link
            href="/projects"
            className="font-mono text-xs transition-opacity hover:opacity-70"
            style={{ color: 'var(--muted)' }}
          >
          ← projects
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-10 mb-2 flex items-center gap-4">
            <h1
              className="text-3xl font-black tracking-tight"
              style={{ color: 'var(--fg)' }}
            >
              {project.title}
            </h1>
            {project.status && (
              <span className="font-mono text-xs" style={{ color: statusColor }}>
                {project.status}
              </span>
            )}
          </div>
          {project.year && (
            <p className="font-mono text-xs mb-6" style={{ color: 'var(--muted)' }}>
              {project.year}
            </p>
          )}
          <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--muted)' }}>
            {project.description}
          </p>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="flex flex-wrap gap-2 mb-10">
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
        </FadeIn>

        {(project.live_url || project.github_url) && (
          <FadeIn delay={0.14}>
            <div className="flex gap-6 font-mono text-sm mb-12" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
              {project.live_url && (
                <a
                  href={project.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  live ↗
                </a>
              )}
              {project.github_url && (
                <a
                  href={project.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent)' }}
                >
                  github ↗
                </a>
              )}
            </div>
          </FadeIn>
        )}

        {project.long_description && (
          <FadeIn delay={0.18}>
            <div className="mb-12">
              <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
                about
              </p>
              <div className="space-y-4">
                {project.long_description.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {project.highlights && project.highlights.length > 0 && (
          <FadeIn delay={0.22}>
            <div className="mb-12">
              <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
                highlights
              </p>
              <ul className="space-y-3">
                {project.highlights.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                    <span className="flex-shrink-0 font-mono" style={{ color: 'var(--accent)' }}>+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        )}

        {project.challenges && (
          <FadeIn delay={0.26}>
            <div className="mb-12">
              <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
                what was hard
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                {project.challenges}
              </p>
            </div>
          </FadeIn>
        )}

      </div>
    </div>
  )
}
