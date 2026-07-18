import Link from 'next/link'
import PrintButton from '@/components/ui/PrintButton'
import DriftingSquares from '@/components/ui/DriftingSquares'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'cv',
  description: 'Verrel Mohammad Al Syoumi, data engineer. Print-ready CV.',
  path: '/cv',
})

// one timeline entry: date in the left rail, content on the right
function Entry({
  date,
  title,
  org,
  bullets,
  stack,
}: {
  date: string
  title: string
  org: string
  bullets?: string[]
  stack?: string
}) {
  return (
    <div className="cv-row grid" style={{ gridTemplateColumns: 'var(--rail)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', paddingTop: 3 }}>
        {date}
      </div>
      <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: '1.25rem', paddingBottom: '1.5rem' }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{title}</p>
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>{org}</p>
        {bullets && (
          <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {bullets.map((b) => (
              <li key={b} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.55, color: 'var(--fg)' }}>
                <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', color: 'var(--accent-text)' }}>+</span>
                {b}
              </li>
            ))}
          </ul>
        )}
        {stack && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{stack}</p>
        )}
      </div>
    </div>
  )
}

// a section: label in the rail, content on the right
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="cv-section" style={{ marginTop: '2rem' }}>
      <div className="grid" style={{ gridTemplateColumns: 'var(--rail)' }}>
        <div
          className="uppercase"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-text)', letterSpacing: '0.1em', paddingTop: 3 }}
        >
          {label}
        </div>
        <div style={{ paddingLeft: '1.25rem' }} />
      </div>
      <div style={{ marginTop: '0.75rem' }}>{children}</div>
    </div>
  )
}

export default function CVPage() {
  return (
    <section className="min-h-screen relative overflow-hidden" style={{ paddingTop: '3.5rem' }}>
      <style>{`
        /* the rail width is the visible margin/column system; stacks to one column on phones */
        .cv-doc { --rail: 1fr; }
        @media (min-width: 560px) { .cv-doc { --rail: 110px 1fr; } }
        @media (min-width: 768px) { .cv-doc { --rail: 150px 1fr; } }
        @media (max-width: 559px) {
          .cv-row, .cv-section > .grid { row-gap: 0.35rem; }
        }
        @media print {
          .cv-doc { --rail: 150px 1fr !important; }
          nav, footer, .cv-actions, [aria-hidden="true"] { display: none !important; }
          [data-room="cv"] { background: #fff !important; color: #000 !important; }
          .cv-doc { padding: 0 !important; max-width: 100% !important; border: none !important; }
          .cv-section, .cv-row { break-inside: avoid; }
        }
      `}</style>

      <DriftingSquares variant="cv" color="var(--vermilion)" opacity={0.05} count={5} />

      {/* screen-only actions */}
      <div className="cv-actions mx-auto px-6 flex items-center justify-between" style={{ maxWidth: '60rem', paddingTop: '1.5rem', position: 'relative', zIndex: 1 }}>
        <Link href="/about" className="transition-opacity hover:opacity-70" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
          ← about
        </Link>
        <PrintButton />
      </div>

      {/* the document */}
      <div
        className="cv-doc mx-auto px-8 py-10"
        style={{ maxWidth: '60rem', marginTop: '1.5rem', border: '1px solid var(--rule)', background: 'var(--bg)', position: 'relative', zIndex: 1 }}
      >
        {/* letterhead */}
        <header style={{ borderBottom: '2px solid var(--fg)', paddingBottom: '1.25rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
            }}
          >
            Verrel Mohammad Al Syoumi
          </h1>
          <p style={{ fontSize: 14, color: 'var(--accent-text)', marginTop: 2 }}>data engineer</p>
          <div
            className="flex flex-wrap gap-x-4 gap-y-1"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: '0.75rem' }}
          >
            <a href="mailto:verrel.alsyoumi@gmail.com" style={{ color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', minHeight: 24 }}>verrel.alsyoumi@gmail.com</a>
            <a href="https://linkedin.com/in/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', minHeight: 24 }}>linkedin.com/in/boyzwhocried</a>
            <a href="https://github.com/boyzwhocried" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', minHeight: 24 }}>github.com/boyzwhocried</a>
            <span>East Jakarta, Indonesia · open to remote</span>
          </div>
        </header>

        <Section label="summary">
          <div className="grid" style={{ gridTemplateColumns: 'var(--rail)' }}>
            <div />
            <p style={{ borderLeft: '1px solid var(--rule)', paddingLeft: '1.25rem', fontSize: 13, lineHeight: 1.6, color: 'var(--fg)' }}>
              data engineer with nearly 2 years building ETL pipelines, stored procedures, and data
              warehouse layers in a production insurance environment. proficient in SQL Server, SSIS,
              T-SQL, and Python. reduced a critical pipeline from 3+ hours to under 20 minutes through
              T-SQL optimization and indexing.
            </p>
          </div>
        </Section>

        <Section label="experience">
          <Entry
            date="Sep 2024 - now"
            title="Data Engineer"
            org="life-insurance sector · contract (via IT consultancy) · hybrid, Jakarta"
            bullets={[
              'Optimized T-SQL stored procedures for automated monthly closing, cutting execution time from 3+ hours to under 20 minutes via query restructuring and indexing',
              'Designed and maintained SSIS ETL pipelines across 3 insurance product lines (credit life, microinsurance, telemarketing) for monthly production-scale consolidation',
              'Built Bronze/Silver/Gold data warehouse layers (SSOT initiative): staging, transformation, and integration across multiple source systems and SQL Server instances',
            ]}
            stack="SQL Server (SSMS) · SSIS · T-SQL · Python · Tableau"
          />
          <Entry
            date="Aug - Dec 2019"
            title="Maintenance Engineer"
            org="PT Federal Izumi Mfg. · internship · Cileungsi, West Java"
            bullets={[
              'Built an automated CNC machine alert system with real-time fault detection, reducing manual monitoring overhead',
              'Maintained factory-floor CNC machinery: mechanical repairs, welding, and preventive maintenance',
            ]}
          />
        </Section>

        <Section label="projects">
          <Entry
            date="2026"
            title="Strata"
            org="personal · github.com/boyzwhocried/strata"
            bullets={[
              'Public medallion pipeline (Bronze/Silver/Gold) on synthetic insurance data: SCD2 dimensions, data contracts, 42 automated tests, CI green on every push',
            ]}
            stack="DuckDB · dbt · Python · GitHub Actions"
          />
          <Entry
            date="ongoing"
            title="Personal OS / Knowledge Bot"
            org="personal"
            bullets={[
              'LLM-integrated personal knowledge system: a Telegram bot syncs a structured Obsidian wiki to Supabase via automated weekly ingestion, with autonomous agents for ingest, sync, and review',
            ]}
            stack="Python · Supabase · PostgreSQL · Claude API · Telegram Bot API"
          />
          <Entry
            date="active"
            title="Vault of Frights"
            org="personal"
            bullets={[
              'Fully automated YouTube Shorts pipeline: script generation (Groq/Llama 3), TTS narration, video assembly (moviepy), thumbnails, and upload. Zero manual work per video',
            ]}
            stack="Python · Groq API · moviepy · YouTube Data API"
          />
        </Section>

        <Section label="education">
          <Entry
            date="2021 - 2023"
            title="BINUS University"
            org="Bachelor of Computer Science · GPA 3.46 · thesis: micro-frontend HR app (React, Webpack federation)"
          />
          <Entry
            date="2017 - 2020"
            title="Polman Bandung (PMS-ITB)"
            org="Associate, Mechatronics Engineering · GPA 3.14 · final project: 3D interpolation engraving CNC machine (VB.NET)"
          />
        </Section>

        <Section label="skills">
          <div className="grid" style={{ gridTemplateColumns: 'var(--rail)' }}>
            <div />
            <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--fg)' }}>
              <p><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>data engineering</span> · SQL Server · T-SQL · SSIS · ETL · data warehousing · medallion architecture</p>
              <p><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>languages</span> · Python · SQL · TypeScript</p>
              <p><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>tools</span> · Tableau · Git · Docker</p>
              <p><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>frontend (secondary)</span> · React · Next.js · Tailwind</p>
              <p><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>spoken</span> · Indonesian (native) · English (fluent, EF SET certified)</p>
            </div>
          </div>
        </Section>
      </div>
    </section>
  )
}
