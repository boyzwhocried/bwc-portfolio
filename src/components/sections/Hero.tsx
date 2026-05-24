import { Project } from '@/types'
import ProjectCard from './ProjectCard'
import FadeIn from '@/components/ui/FadeIn'

interface HeroProps {
  featuredProjects: Project[]
}

export default function Hero({ featuredProjects }: HeroProps) {
  return (
    <section data-theme="swiss" className="min-h-screen pt-14">
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        <FadeIn delay={0}>
          <h1
            className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6"
            style={{ color: 'var(--fg)' }}
          >
            Verrel
            <br />
            Al Syoumi
          </h1>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p
            className="text-lg max-w-lg mb-4"
            style={{ color: 'var(--muted)' }}
          >
            Data engineer. Frontend builder. Based in Indonesia.
          </p>
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            Available for work — Sep 2026
          </p>
        </FadeIn>

        {featuredProjects.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="mt-24">
              <p
                className="font-mono text-xs uppercase tracking-widest mb-8"
                style={{ color: 'var(--muted)' }}
              >
                Featured Projects
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredProjects.map((project, i) => (
                  <FadeIn key={project.id} delay={0.1 * i} direction="up">
                    <ProjectCard project={project} />
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  )
}
