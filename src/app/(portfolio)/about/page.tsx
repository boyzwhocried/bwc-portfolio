import { Metadata } from 'next'
import Link from 'next/link'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'about',
  description: 'data engineer, frontend builder, based in Indonesia.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-14 relative">

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

        {/* intro + photo */}
        <FadeIn delay={0.08}>
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            {/* profile photo placeholder — replace with 400x400px jpg/webp */}
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
                based in Indonesia, currently working on data pipelines and DWH architecture.
              </p>
              <p>
                i care about systems that actually work: data that&apos;s correct, interfaces that
                don&apos;t get in the way, code that still makes sense six months later.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.14}>
          <div className="space-y-4 text-base leading-relaxed mb-14" style={{ color: 'var(--fg)' }}>
            <p>
              outside work i&apos;m building stuff: an automated YouTube channel, a wiki that knows
              everything about my life, an e-invite platform with some friends. mostly just
              solving problems that bother me, or learning things i find interesting.
            </p>
            <p>
              i also make music playlists, play Valorant more than i should, and think way too much
              about systems and automation. if you want to talk about any of that, hit the contact page.
            </p>
          </div>
        </FadeIn>

        {/* currently */}
        <FadeIn delay={0.20}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              currently
            </p>
            <ul className="space-y-2.5 text-sm" style={{ color: 'var(--fg)' }}>
              {[
                'data engineering at BRILife (contract, until Sep 2026)',
                'building Undangin, a B2B e-invite platform',
                'running an automated YouTube horror channel',
                'working on a personal wiki that knows too much about me',
                'studying for Azure DP-900 (Q3 2026)',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="font-mono flex-shrink-0" style={{ color: 'var(--muted)' }}>+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        {/* links */}
        <FadeIn delay={0.26}>
          <div className="mt-12 flex flex-wrap gap-6 font-mono text-sm">
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              linkedin ↗
            </a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              github ↗
            </a>
            <Link href="/cv" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              cv ↗
            </Link>
            <Link href="/contact" className="transition-opacity hover:opacity-70" style={{ color: 'var(--accent)' }}>
              contact ↗
            </Link>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
