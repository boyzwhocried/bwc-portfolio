import Link from 'next/link'
import { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block transition-opacity hover:opacity-80"
      style={{ border: '1px solid var(--border)' }}
    >
      {/* placeholder thumbnail */}
      <div
        className="w-full h-36 flex items-center justify-center font-mono text-xs uppercase tracking-widest"
        style={{
          background: 'var(--border)',
          color: 'var(--muted)',
          letterSpacing: '0.2em',
        }}
        aria-hidden
      >
        {project.slug.split('-').join(' ')}
      </div>

      <div className="p-5">
        <h3 className="font-mono text-sm mb-2" style={{ color: 'var(--fg)' }}>
          {project.title}
        </h3>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
          {project.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {project.tech_stack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="font-mono text-xs px-2 py-0.5"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 4 && (
            <span className="font-mono text-xs px-2 py-0.5" style={{ color: 'var(--muted)' }}>
              +{project.tech_stack.length - 4}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
