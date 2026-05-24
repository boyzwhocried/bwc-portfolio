import { Project } from '@/types'
import ProjectCard from './ProjectCard'
import FadeIn from '@/components/ui/FadeIn'

interface ProjectGridProps {
  projects: Project[]
}

export default function ProjectGrid({ projects }: ProjectGridProps) {
  return (
    <div data-theme="mono" className="min-h-screen pt-14">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <FadeIn>
          <p
            className="font-mono text-xs uppercase tracking-widest mb-12"
            style={{ color: 'var(--muted)' }}
          >
            Projects
          </p>
        </FadeIn>
        {projects.length === 0 ? (
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            No projects yet.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <FadeIn key={project.id} delay={0.05 * i}>
                <ProjectCard project={project} />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
