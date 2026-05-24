import { Metadata } from 'next'
import Link from 'next/link'
import PrintButton from '@/components/ui/PrintButton'

export const metadata: Metadata = {
  title: 'cv',
  description: 'Verrel Mohammad Al Syoumi — Data Engineer',
}

export default function CVPage() {
  return (
    <div data-theme="minimal" className="min-h-screen pt-14">
      <style>{`
        @media print {
          nav, footer, .cv-nav-actions { display: none !important; }
          body { padding: 0 !important; }
          [data-theme] { background: white !important; color: black !important; }
          .cv-container { padding-top: 0 !important; max-width: 100% !important; }
          .cv-section { break-inside: avoid; }
        }
      `}</style>

      {/* screen-only back + print actions */}
      <div className="cv-nav-actions max-w-2xl mx-auto px-6 pt-6 flex items-center justify-between">
        <Link
          href="/about"
          className="font-mono text-xs transition-opacity hover:opacity-60"
          style={{ color: 'var(--muted)' }}
        >
          ← about
        </Link>
        <PrintButton />
      </div>

      <div className="cv-container max-w-2xl mx-auto px-6 pt-10 pb-20">

        {/* header */}
        <div className="cv-section mb-8" style={{ borderBottom: '2px solid var(--fg)', paddingBottom: '1.5rem' }}>
          <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--fg)' }}>
            Verrel Mohammad Al Syoumi
          </h1>
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>Data Engineer</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs" style={{ color: 'var(--muted)' }}>
            <a href="mailto:verrel.alsyoumi@gmail.com" style={{ color: 'var(--fg)' }}>verrel.alsyoumi@gmail.com</a>
            <span>+62 811 1340 923</span>
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)' }}>linkedin.com/in/boyzwhocried</a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)' }}>github.com/boyzwhocried</a>
            <span>East Jakarta, Indonesia · open to remote</span>
          </div>
        </div>

        {/* summary */}
        <div className="cv-section mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>summary</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
            Data Engineer with nearly 2 years of experience building ETL pipelines, stored procedures, and data warehouse layers in a production insurance environment. Proficient in SQL Server, SSIS, T-SQL, and Python. Reduced a critical pipeline execution time from 3+ hours to under 20 minutes through T-SQL optimization and indexing.
          </p>
        </div>

        {/* experience */}
        <div className="cv-section mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--muted)' }}>experience</h2>

          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Data Engineer</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>PT Asuransi BRI Life (via Lawencon International) · contract · hybrid · Jakarta</p>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>Sep 2024 – present</span>
            </div>
            <ul className="space-y-1.5 mt-2">
              {[
                'Optimized T-SQL stored procedures for automated monthly closing, reducing execution time from 3+ hours to under 20 minutes through query restructuring and indexing',
                'Designed and maintained SSIS ETL pipelines for 3 insurance product lines (credit life, microinsurance, telemarketing) handling monthly production-scale consolidation',
                'Built Bronze/Silver/Gold data warehouse layers (SSOT initiative) covering staging, transformation, and integration across multiple source systems and SQL Server instances',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--fg)' }}>
                  <span className="flex-shrink-0" style={{ color: 'var(--muted)' }}>+</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
              SQL Server (SSMS) · SSIS · T-SQL · Python · Tableau
            </p>
          </div>

          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Maintenance Engineer</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>PT Federal Izumi Mfg. · internship · Cileungsi, West Java</p>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>Aug – Dec 2019</span>
            </div>
            <ul className="space-y-1.5 mt-2">
              {[
                'Built automated CNC machine alert system monitoring fault detection, notifying control center in real time and reducing manual monitoring overhead',
                'Maintained factory floor CNC machinery, performed mechanical repairs, welding, and preventive maintenance',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--fg)' }}>
                  <span className="flex-shrink-0" style={{ color: 'var(--muted)' }}>+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* projects */}
        <div className="cv-section mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--muted)' }}>projects</h2>

          <div className="mb-4">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Personal OS / Knowledge Bot <span className="font-normal" style={{ color: 'var(--muted)' }}>(personal, ongoing)</span></p>
            <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--fg)' }}>
              LLM-integrated personal knowledge system with a Telegram bot (@Apollo26TeleBot) that syncs a structured Obsidian wiki to Supabase via automated weekly ingestion. Autonomous agents handle ingest, sync, and weekly review.
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Python · Supabase · PostgreSQL · Claude API · Telegram Bot API</p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg)' }}>Vault of Frights <span className="font-normal" style={{ color: 'var(--muted)' }}>(personal, active)</span></p>
            <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--fg)' }}>
              Fully automated YouTube Shorts pipeline: script generation (Groq/Llama 3), TTS narration (edge-tts), video assembly (moviepy), thumbnail generation, and YouTube Data API upload. Zero manual work per video.
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Python · Groq API · moviepy · YouTube Data API</p>
          </div>
        </div>

        {/* skills */}
        <div className="cv-section mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>skills</h2>
          <div className="space-y-1.5 text-xs" style={{ color: 'var(--fg)' }}>
            <p><span style={{ color: 'var(--muted)' }} className="font-mono">data engineering</span> · SQL Server · T-SQL · SSIS · ETL · Data Warehousing · medallion architecture</p>
            <p><span style={{ color: 'var(--muted)' }} className="font-mono">languages</span> · Python · SQL · TypeScript</p>
            <p><span style={{ color: 'var(--muted)' }} className="font-mono">visualization</span> · Tableau</p>
            <p><span style={{ color: 'var(--muted)' }} className="font-mono">tools</span> · Git · Docker</p>
            <p><span style={{ color: 'var(--muted)' }} className="font-mono">frontend (secondary)</span> · React · Next.js · Tailwind</p>
          </div>
        </div>

        {/* education */}
        <div className="cv-section mb-8">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-5" style={{ color: 'var(--muted)' }}>education</h2>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>BINUS University</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Bachelor of Computer Science · GPA 3.46</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Thesis: micro frontend HR app (React.js, Webpack federation)</p>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>2021 – 2023</span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Polman Bandung (PMS-ITB)</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Associate, Mechatronics Engineering · GPA 3.14</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Final project: 3D Interpolation Engraving CNC Machine (VB.NET)</p>
              </div>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>2017 – 2020</span>
            </div>
          </div>
        </div>

        {/* languages */}
        <div className="cv-section">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>languages</h2>
          <p className="text-xs" style={{ color: 'var(--fg)' }}>Indonesian (native) · English (fluent, EF SET certified)</p>
        </div>

      </div>
    </div>
  )
}
