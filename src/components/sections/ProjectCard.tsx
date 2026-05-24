import Link from 'next/link'
import { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

const STATUS_LABEL: Record<string, string> = {
  active: 'active',
  shipped: 'shipped',
  archived: 'archived',
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group flex flex-col h-full transition-opacity hover:opacity-80"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* placeholder thumbnail */}
      <div
        className="w-full h-36 flex-shrink-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest"
        style={{
          background: 'var(--border)',
          color: 'var(--muted)',
          letterSpacing: '0.2em',
        }}
        aria-hidden
      >
        {project.slug.split('-').join(' ')}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="font-mono text-sm" style={{ color: 'var(--fg)' }}>
            {project.title}
          </h2>
          {project.year && (
            <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
              {project.year}
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--muted)' }}>
          {project.description}
        </p>

        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {project.tech_stack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="font-mono text-xs px-2 py-0.5"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                {tech}
              </span>
            ))}
            {project.tech_stack.length > 3 && (
              <span className="font-mono text-xs px-2 py-0.5" style={{ color: 'var(--muted)' }}>
                +{project.tech_stack.length - 3}
              </span>
            )}
          </div>
          {project.status && project.status !== 'shipped' && (
            <span
              className="font-mono text-xs flex-shrink-0"
              style={{ color: project.status === 'active' ? 'var(--accent)' : 'var(--muted)' }}
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
