import { Metadata } from 'next'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'About',
  description: 'Data engineer, frontend builder, based in Indonesia.',
}

export default function AboutPage() {
  return (
    <div data-theme="genx" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">

        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-12" style={{ color: 'var(--muted)' }}>
            About
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-6 text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
            <p>
              hey. i&apos;m Verrel Al Syoumi, data engineer by day, builder of random things by night.
              based in Indonesia, currently on contract at BRILife working on data pipelines,
              DWH architecture, and internal tooling until September 2026.
            </p>
            <p>
              i care a lot about systems that actually work: data that&apos;s correct, interfaces that
              don&apos;t get in the way, code that makes sense when you come back to it six months later.
              not the most glamorous things to care about, but they matter.
            </p>
            <p>
              outside work i&apos;m building stuff: an automated YouTube channel, a wiki that knows
              everything about my life, an e-invite platform with some friends. most of it is
              just me trying to solve problems that bother me, or learning things i find interesting.
            </p>
            <p>
              i also make music playlists, play Valorant more than i should, and think way too much
              about systems and automation. if you want to talk about any of that, hit the contact page.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-16">
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              What i work with
            </p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-8 font-mono text-sm">
              {[
                ['T-SQL / SQL Server', 'daily'],
                ['Python', 'daily'],
                ['SSIS / ETL', 'daily'],
                ['TypeScript', 'projects'],
                ['Next.js', 'projects'],
                ['Supabase', 'projects'],
                ['Tableau', 'work'],
                ['Azure', 'learning'],
              ].map(([tech, context]) => (
                <div key={tech} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--fg)' }}>{tech}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{context}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mt-16">
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              Currently
            </p>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--fg)' }}>
              <li>data engineering at BRILife (contract, until Sep 2026)</li>
              <li>building Undangin, a B2B e-invite platform</li>
              <li>running an automated YouTube horror channel</li>
              <li>working on a personal wiki that knows too much about me</li>
              <li>studying for Azure DP-900 (Q3 2026)</li>
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-16 flex gap-6 font-mono text-sm">
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              LinkedIn ↗
            </a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              GitHub ↗
            </a>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
