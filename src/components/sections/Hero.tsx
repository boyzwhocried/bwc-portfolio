import { Project } from '@/types'
import ProjectCard from './ProjectCard'
import FadeIn from '@/components/ui/FadeIn'
import AmbientBlobs from '@/components/ui/AmbientBlobs'
import Marquee from '@/components/ui/Marquee'

const STACK_ITEMS = [
  'T-SQL', 'Python', 'TypeScript', 'Next.js', 'Supabase',
  'SSIS', 'SQL Server', 'React', 'Framer Motion', 'Tableau', 'Azure',
]

interface HeroProps {
  featuredProjects: Project[]
}

export default function Hero({ featuredProjects }: HeroProps) {
  return (
    <section data-theme="swiss" className="min-h-screen pt-14 relative overflow-hidden">
      <AmbientBlobs />

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-8 relative z-10">
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

        <FadeIn delay={0.12}>
          <p className="text-lg max-w-lg mb-2" style={{ color: 'var(--muted)' }}>
            data engineer. builder of things. based in Indonesia.
          </p>
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            available Sep 2026
          </p>
        </FadeIn>
      </div>

      <FadeIn delay={0.2}>
        <div className="my-10">
          <Marquee items={STACK_ITEMS} speed={25} />
        </div>
      </FadeIn>

      <div className="max-w-5xl mx-auto px-6 pb-16 relative z-10">
        {featuredProjects.length > 0 && (
          <FadeIn delay={0.25}>
            <div className="mt-8">
              <p
                className="font-mono text-xs uppercase tracking-widest mb-8"
                style={{ color: 'var(--muted)' }}
              >
                Featured Projects
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {featuredProjects.map((project, i) => (
                  <FadeIn key={project.id} delay={0.08 * i} direction="up">
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
