import { Project } from '@/types'
import ProjectCard from './ProjectCard'

interface ProjectGridProps {
  projects: Project[]
}

export default function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div data-theme="mono" className="min-h-screen pt-14">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <p
          className="font-mono text-xs uppercase tracking-widest mb-12"
          style={{ color: 'var(--muted)' }}
        >
          Projects
        </p>
        {projects.length === 0 ? (
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            No projects yet.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
