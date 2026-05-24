import { Project } from '@/types'
import ProjectCard from './ProjectCard'

interface HeroProps {
  featuredProjects: Project[]
}

export default function Hero({ featuredProjects }: HeroProps) {
  return (
    <section data-theme="swiss" className="min-h-screen pt-14">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <h1
          className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6"
          style={{ color: 'var(--fg)' }}
        >
          Verrel
          <br />
          Alsyoumi
        </h1>
        <p
          className="text-lg max-w-lg mb-4"
          style={{ color: 'var(--muted)' }}
        >
          Data engineer. Frontend builder. Based in Indonesia.
        </p>
        <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
          Available for work — Sep 2026
        </p>

        {featuredProjects.length > 0 && (
          <div className="mt-24">
            <p
              className="font-mono text-xs uppercase tracking-widest mb-8"
              style={{ color: 'var(--muted)' }}
            >
              Featured Projects
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
