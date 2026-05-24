import Link from 'next/link'
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
              <h2
                className="font-mono text-xs uppercase tracking-widest mb-8"
                style={{ color: 'var(--muted)' }}
              >
                Featured Projects
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                {featuredProjects.map((project, i) => (
                  <FadeIn key={project.id} delay={0.08 * i} direction="up" className="h-full">
                    <ProjectCard project={project} />
                  </FadeIn>
                ))}

                {/* view all card */}
                <FadeIn delay={0.08 * featuredProjects.length} direction="up" className="h-full">
                  <Link
                    href="/projects"
                    className="group flex flex-col items-center justify-center h-full min-h-48 transition-opacity hover:opacity-80"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <span
                      className="font-mono text-xs uppercase tracking-widest mb-2"
                      style={{ color: 'var(--muted)' }}
                    >
                      all projects
                    </span>
                    <span
                      className="text-2xl transition-transform group-hover:translate-x-1"
                      style={{ color: 'var(--fg)' }}
                    >
                      →
                    </span>
                  </Link>
                </FadeIn>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </section>
  )
}
