import { Metadata } from 'next'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'about',
  description: 'data engineer, frontend builder, based in Indonesia.',
}

export default function AboutPage() {
  return (
    <div data-theme="genx" className="min-h-screen pt-14 relative overflow-hidden">

      {/* subtle single blob */}
      <style>{`
        @keyframes aboutBlob {
          0%   { transform: translate(0,0) scale(1);    border-radius: 55% 45% 60% 40% / 50% 60% 40% 50%; }
          33%  { transform: translate(-20px,18px) scale(1.05); border-radius: 40% 60% 45% 55% / 62% 38% 58% 42%; }
          66%  { transform: translate(14px,-14px) scale(0.97); border-radius: 62% 38% 52% 48% / 42% 58% 44% 56%; }
          100% { transform: translate(0,0) scale(1);    border-radius: 55% 45% 60% 40% / 50% 60% 40% 50%; }
        }
        .about-blob {
          position: absolute;
          pointer-events: none;
          width: 400px;
          height: 400px;
          background: #8a9e8a;
          top: -60px;
          right: -100px;
          filter: blur(90px);
          opacity: 0.07;
          will-change: transform, border-radius;
          animation: aboutBlob 28s ease-in-out infinite;
        }
      `}</style>
      <div className="about-blob" aria-hidden />

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16 relative z-10">

        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-12" style={{ color: 'var(--muted)' }}>
            about
          </p>
        </FadeIn>

        {/* profile picture placeholder + intro side by side on md+ */}
        <FadeIn delay={0.08}>
          <div className="flex flex-col md:flex-row gap-8 mb-12">
            {/* profile picture placeholder — replace src with actual photo */}
            <div
              className="flex-shrink-0 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center font-mono text-xs uppercase tracking-widest self-start"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--border)', aspectRatio: '1' }}
              aria-label="profile photo placeholder"
            >
              {/* NOTE: drop a square photo here when ready. recommended: 400x400px, jpg/webp */}
              photo
            </div>

            <div className="space-y-5 text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
              <p>
                hey. i&apos;m Verrel Al Syoumi, data engineer by day, builder of random things by night.
                based in Indonesia, currently on contract at BRILife working on data pipelines,
                DWH architecture, and internal tooling.
              </p>
              <p>
                i care a lot about systems that actually work: data that&apos;s correct, interfaces that
                don&apos;t get in the way, code that makes sense when you come back to it six months later.
                not the most glamorous things to care about, but they matter.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="space-y-5 text-base leading-relaxed mb-12" style={{ color: 'var(--fg)' }}>
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

        <FadeIn delay={0.22}>
          <div className="mt-12">
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              what i work with
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
              currently
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

        <FadeIn delay={0.38}>
          <div className="mt-16 flex gap-6 font-mono text-sm">
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              linkedin ↗
            </a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              github ↗
            </a>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
