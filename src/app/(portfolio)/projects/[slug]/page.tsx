import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAllProjects, getProjectBySlug } from '@/lib/projects'
import Reveal from '@/components/ui/Reveal'
import DropCap from '@/components/ui/DropCap'
import { pageMetadata } from '@/lib/metadata'

export const revalidate = 3600

export async function generateStaticParams() {
  const projects = await getAllProjects()
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Not Found' }
  return pageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${slug}`,
    image: `/projects/${slug}/opengraph-image`,
  })
}

// kicker label from tags
function getTypeLabel(tags: string[]): string {
  if (tags.includes('work') || tags.includes('data-engineering')) return 'data engineering'
  if (tags.includes('startup')) return 'startup'
  if (tags.includes('freelance')) return 'freelance'
  if (tags.includes('automation')) return 'automation'
  if (tags.includes('university')) return 'university'
  return 'project'
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  // vermilion RETURNS here (the index was monochrome; depth gets the accent).
  // bright var(--vermilion) for LARGE display marks (drop-cap); the AA-safe
  // var(--accent-text) for SMALL text (bright vermilion is only 3.1:1 on paper, fails AA).
  const v = 'var(--vermilion)'
  const vText = 'var(--accent-text)'
  const typeLabel = getTypeLabel(project.tags ?? [])
  const paras = project.long_description ? project.long_description.split('\n\n') : []

  return (
    <article className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <div className="mx-auto px-6" style={{ maxWidth: '56rem', paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* back to index */}
        <Link
          href="/projects"
          className="transition-opacity hover:opacity-70"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: vText }}
        >
          ← index
        </Link>

        {/* kicker + title */}
        <Reveal style={{ marginTop: '2rem' }}>
          <div
            className="uppercase"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: vText, letterSpacing: '0.1em' }}
          >
            CASE STUDY · {typeLabel}
            {project.year ? ` · ${project.year}` : ''}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 6vw, 3.25rem)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
              marginTop: '0.6rem',
              color: 'var(--fg)',
            }}
          >
            {project.title}
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', marginTop: '1rem', maxWidth: '40rem' }}>
            {project.description}
          </p>
        </Reveal>

        {/* two-column: meta rail + body */}
        <div
          className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-10"
          style={{ marginTop: '2.5rem', borderTop: '1px solid var(--rule)', paddingTop: '2rem' }}
        >
          {/* meta rail */}
          <aside className="md:col-span-4" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            <Reveal delay={0.08} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {project.status && (
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    status
                  </div>
                  <div style={{ color: vText, marginTop: 4 }}>● {project.status}</div>
                </div>
              )}
              {project.tech_stack?.length > 0 && (
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    stack
                  </div>
                  <div style={{ color: 'var(--fg)', marginTop: 4, lineHeight: 1.7 }}>
                    {project.tech_stack.map((t) => (
                      <div key={t}>{t}</div>
                    ))}
                  </div>
                </div>
              )}
              {(project.live_url || project.github_url) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {project.live_url && (
                    <a href={project.live_url} target="_blank" rel="noopener noreferrer"
                       className="transition-opacity hover:opacity-70" style={{ color: vText }}>
                      live ↗
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                       className="transition-opacity hover:opacity-70" style={{ color: vText }}>
                      github ↗
                    </a>
                  )}
                </div>
              )}
            </Reveal>
          </aside>

          {/* body */}
          <div className="md:col-span-8">
            <Reveal delay={0.16}>
            {paras.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {paras.map((para, i) => (
                  <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--fg)' }}>
                    {/* crooked vermilion drop-cap, randomized lean per load */}
                    {i === 0 && <DropCap char={para.charAt(0)} color={v} />}
                    {i === 0 ? para.slice(1) : para}
                  </p>
                ))}
              </div>
            )}

            {project.highlights?.length > 0 && (
              <div style={{ marginTop: '2.5rem' }}>
                <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                  highlights
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {project.highlights.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 12, fontSize: 14, lineHeight: 1.6, color: 'var(--fg)' }}>
                      <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', color: vText }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.challenges && (
              <div style={{ marginTop: '2.5rem' }}>
                <p className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                  what was hard
                </p>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--fg)' }}>{project.challenges}</p>
              </div>
            )}
            </Reveal>
          </div>
        </div>
      </div>
    </article>
  )
}
