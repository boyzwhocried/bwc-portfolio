import Link from 'next/link'
import { BlogPostListItem } from '@/lib/mdx'

export default function BlogList({ posts }: { posts: BlogPostListItem[] }) {
  const issueNo = posts.length
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <div className="mx-auto px-6" style={{ maxWidth: '64rem', paddingTop: '2.5rem', paddingBottom: '4rem' }}>
        {/* masthead */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2.6rem, 9vw, 5.5rem)',
              lineHeight: 0.86,
              letterSpacing: '-0.03em',
              color: 'var(--fg)',
            }}
          >
            built &amp; broken
          </h1>
          <div
            className="md:text-right"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', lineHeight: 1.7 }}
          >
            <div>ISSUE No. {String(issueNo).padStart(2, '0')}</div>
            <div style={{ color: 'var(--muted)' }}>jakarta · 2026</div>
            <div style={{ color: 'var(--muted)' }}>writing on data, building &amp; chaos</div>
          </div>
        </div>

        {/* heavy 3px rule (the entry gesture) */}
        <div style={{ height: 3, background: 'var(--fg)', marginTop: '1.25rem' }} />

        {posts.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--muted)', marginTop: '2rem' }}>
            nothing published yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-x-10 gap-y-12" style={{ marginTop: '2.5rem' }}>
            {/* featured lead article */}
            <div
              className="md:col-span-7 md:pr-10"
              style={{ borderRight: '1px solid var(--rule)' }}
            >
              <Link href={`/blog/${featured.slug}`} className="group block transition-opacity hover:opacity-80">
                <div
                  className="uppercase"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: '0.75rem' }}
                >
                  featured
                </div>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                    lineHeight: 1.02,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg)',
                  }}
                >
                  {featured.title}
                </h2>
                {/* serif body (the TYPE break) */}
                <p
                  style={{ fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.6, color: 'var(--fg)', marginTop: '1rem' }}
                >
                  {featured.summary}
                </p>
                <div
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginTop: '1.25rem' }}
                >
                  {featured.date} · {featured.readMin} min read
                </div>
              </Link>
            </div>

            {/* contents list */}
            <div className="md:col-span-5">
              <div
                className="uppercase"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: '1rem' }}
              >
                in this issue
              </div>
              <ul>
                {rest.map((post, i) => (
                  <li key={post.slug} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-baseline gap-4 transition-opacity hover:opacity-70"
                      style={{ paddingTop: 14, paddingBottom: 14 }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
                        {String(i + 2).padStart(2, '0')}
                      </span>
                      <span className="min-w-0">
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            fontSize: 17,
                            lineHeight: 1.15,
                            color: 'var(--fg)',
                            display: 'block',
                          }}
                        >
                          {post.title}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                          {post.date} · {post.readMin} min
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
