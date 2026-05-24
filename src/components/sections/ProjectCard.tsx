import Link from 'next/link'
import { Project } from '@/types'

interface ProjectCardProps {
  project: Project
}

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block p-6 transition-opacity hover:opacity-70"
      style={{ border: '1px solid var(--border)' }}
    >
      <h3 className="font-mono text-sm mb-2" style={{ color: 'var(--fg)' }}>
        {project.title}
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
        {project.description}
      </p>
      <div className="flex flex-wrap gap-2">
        {project.tech_stack.map((tech) => (
          <span
            key={tech}
            className="font-mono text-xs px-2 py-0.5"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--muted)',
            }}
          >
            {tech}
          </span>
        ))}
      </div>
    </Link>
  )
}
