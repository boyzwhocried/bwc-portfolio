import { Metadata } from 'next'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'About | boyzwhocried',
  description: 'Data engineer, frontend builder, based in Indonesia.',
}

export default function AboutPage() {
  return (
    <div data-theme="genx" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <FadeIn>
          <p
            className="font-mono text-xs uppercase tracking-widest mb-12"
            style={{ color: 'var(--muted)' }}
          >
            About
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-8 text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
            <p>
              I&apos;m Verrel Al Syoumi, a data engineer and frontend builder based in Indonesia.
              Currently on contract at BRILife until September 2026, working on
              data pipelines, DWH, and internal tooling.
            </p>
            <p>
              I care about data that&apos;s actually correct, interfaces that don&apos;t get
              in the way, and systems that stay understandable when you come back
              to them six months later.
            </p>
            <p>
              Outside work: building personal projects and working on things
              that keep me curious.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-16">
            <p
              className="font-mono text-xs uppercase tracking-widest mb-6"
              style={{ color: 'var(--muted)' }}
            >
              Stack
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm" style={{ color: 'var(--fg)' }}>
              {[
                'Python', 'SQL', 'Azure', 'dbt',
                'TypeScript', 'Next.js', 'React', 'Supabase',
              ].map((tech) => (
                <span key={tech} style={{ color: 'var(--muted)' }}>
                  — {tech}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-16 flex gap-6 font-mono text-sm">
            <a
              href="https://linkedin.com/in/boyzwhocried"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              LinkedIn ↗
            </a>
            <a
              href="https://github.com/boyzwhocried"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)' }}
            >
              GitHub ↗
            </a>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
