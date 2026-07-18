import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllBlogSlugs, getBlogPostWithContent, readingMinutes } from '@/lib/mdx'
import { blogPostingJsonLd } from '@/lib/jsonld'
import JsonLd from '@/components/JsonLd'
import Reveal from '@/components/ui/Reveal'
import { pageMetadata } from '@/lib/metadata'

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostWithContent(slug)
  if (!post) return { title: 'Not Found' }
  return {
    ...pageMetadata({
      title: post.title,
      description: post.summary,
      path: `/blog/${slug}`,
      image: `/blog/${slug}/opengraph-image`,
    }),
    title: post.title,
    description: post.summary,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getBlogPostWithContent(slug)
  if (!post || !post.published) notFound()

  const readMin = readingMinutes(post.content)

  return (
    <article className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <JsonLd data={blogPostingJsonLd(post)} />
      <div className="mx-auto px-6" style={{ maxWidth: '42rem', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        {/* back to the issue */}
        <Link
          href="/blog"
          className="transition-opacity hover:opacity-70"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)' }}
        >
          ← built &amp; broken
        </Link>

        {/* masthead-style article header */}
        <Reveal style={{ marginTop: '2rem' }}>
        <header>
          <div
            className="uppercase"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-text)', letterSpacing: '0.1em' }}
          >
            {post.date} · {readMin} min read
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              marginTop: '0.75rem',
            }}
          >
            {post.title}
          </h1>
          <p
            style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.55, color: 'var(--muted)', marginTop: '1rem' }}
          >
            {post.summary}
          </p>
          <div className="flex flex-wrap gap-2" style={{ marginTop: '1.25rem' }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '2px 8px', border: '1px solid var(--rule)', color: 'var(--muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </header>
        </Reveal>

        {/* heavy 3px rule, then serif prose */}
        <div style={{ height: 3, background: 'var(--fg)', marginTop: '1.5rem', marginBottom: '2.5rem' }} />

        <Reveal className="blog-prose" amount={0.05}>
          <MDXRemote source={post.content} />
        </Reveal>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--rule)' }}>
          <Link
            href="/blog"
            className="transition-opacity hover:opacity-70"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-text)' }}
          >
            ← back to the issue
          </Link>
        </div>
      </div>
    </article>
  )
}
