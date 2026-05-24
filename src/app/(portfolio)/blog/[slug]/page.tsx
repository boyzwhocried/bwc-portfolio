import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllBlogSlugs, getBlogPostWithContent } from '@/lib/mdx'
import FadeIn from '@/components/ui/FadeIn'

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

  return (
    <div data-theme="minimal" className="min-h-screen pt-14">
      <div className="max-w-xl mx-auto px-6 pt-20 pb-24">

        <FadeIn>
          <Link
            href="/blog"
            className="font-mono text-xs transition-opacity hover:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            ← blog
          </Link>
        </FadeIn>

        <FadeIn delay={0.08}>
          <div className="mt-12 mb-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-xs px-2 py-0.5"
                  style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1
              className="text-3xl font-black tracking-tight leading-tight mb-3"
              style={{ color: 'var(--fg)' }}
            >
              {post.title}
            </h1>
            <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
              {post.summary}
            </p>
            <p className="font-mono text-xs" style={{ color: 'var(--muted)', opacity: 0.7 }}>
              {post.date}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.14}>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
            <article className="blog-prose">
              <MDXRemote source={post.content} />
            </article>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-16 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
            <Link
              href="/blog"
              className="font-mono text-xs transition-opacity hover:opacity-60"
              style={{ color: 'var(--muted)' }}>
              ← back to blog
            </Link>
          </div>
        </FadeIn>

      </div>
    </div>
  )
}
