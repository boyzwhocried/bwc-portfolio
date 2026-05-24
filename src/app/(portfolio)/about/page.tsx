import { Metadata } from 'next'
import Link from 'next/link'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'about',
  description: 'data engineer, frontend builder, based in Indonesia.',
}

export default function AboutPage() {
  return (
    <div data-theme="genx" className="min-h-screen pt-14 relative overflow-hidden">

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

        {/* intro + profile photo */}
        <FadeIn delay={0.08}>
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            {/* profile picture placeholder — replace with actual photo (400x400px, jpg/webp) */}
            <div
              className="flex-shrink-0 w-32 h-32 md:w-36 md:h-36 flex items-center justify-center font-mono text-xs self-start"
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--border)' }}
              aria-label="profile photo placeholder"
            >
              photo
            </div>

            <div className="space-y-4 text-base leading-relaxed" style={{ color: 'var(--fg)' }}>
              <p>
                hey. i&apos;m Verrel Mohammad Al Syoumi, data engineer by day, builder of random things by night.
                based in Indonesia, currently on contract at BRILife working on data pipelines and DWH architecture.
              </p>
              <p>
                i care a lot about systems that actually work: data that&apos;s correct, interfaces that
                don&apos;t get in the way, code that makes sense when you come back to it six months later.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.13}>
          <div className="space-y-4 text-base leading-relaxed mb-12" style={{ color: 'var(--fg)' }}>
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

        {/* experience */}
        <FadeIn delay={0.18}>
          <div className="mt-14" style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
            <p className="font-mono text-xs uppercase tracking-widest mb-8" style={{ color: 'var(--muted)' }}>
              experience
            </p>

            <div className="space-y-8">
              <div>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Data Engineer</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>PT Asuransi BRI Life (via Lawencon) · contract · hybrid</p>
                  </div>
                  <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>Sep 2024 – present</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {[
                    'Optimized T-SQL stored procedures for monthly closing, cutting execution from 3+ hours to under 20 minutes',
                    'Designed ETL pipelines (SSIS) for 3 insurance product lines handling monthly production-scale consolidation',
                    'Built Bronze/Silver/Gold DWH layers (SSOT) across multiple SQL Server instances',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                      <span className="flex-shrink-0 font-mono" style={{ color: 'var(--muted)' }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="font-mono text-xs mt-3" style={{ color: 'var(--muted)' }}>
                  SQL Server · SSIS · T-SQL · Python · Tableau
                </p>
              </div>

              <div>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Maintenance Engineer</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>PT Federal Izumi Mfg. · internship</p>
                  </div>
                  <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>Aug – Dec 2019</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {[
                    'Built automated CNC machine alert system — notified control center on fault detection, reduced manual monitoring overhead',
                    'Maintained factory floor CNC machinery, welding, and preventive maintenance at a piston manufacturing facility',
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                      <span className="flex-shrink-0 font-mono" style={{ color: 'var(--muted)' }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* education */}
        <FadeIn delay={0.23}>
          <div className="mt-14" style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
            <p className="font-mono text-xs uppercase tracking-widest mb-8" style={{ color: 'var(--muted)' }}>
              education
            </p>

            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>BINUS University</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Bachelor of Computer Science · GPA 3.46</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Thesis: micro frontend HR app with React.js and Webpack federation
                  </p>
                </div>
                <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>2021 – 2023</span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Polman Bandung (PMS-ITB)</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Associate, Mechatronics Engineering · GPA 3.14</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Final project: 3D Interpolation Engraving CNC Machine (VB.NET)
                  </p>
                </div>
                <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>2017 – 2020</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* skills */}
        <FadeIn delay={0.27}>
          <div className="mt-14" style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
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

        {/* currently */}
        <FadeIn delay={0.31}>
          <div className="mt-14" style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
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

        {/* links */}
        <FadeIn delay={0.35}>
          <div className="mt-14 flex flex-wrap gap-6 font-mono text-sm">
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              linkedin ↗
            </a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              github ↗
            </a>
            <Link href="/cv" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              view cv ↗
            </Link>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
