import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllBlogSlugs, getBlogPostWithContent } from '@/lib/mdx'

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
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <Link
          href="/blog"
          className="font-mono text-xs"
          style={{ color: 'var(--muted)' }}
        >
          ← Blog
        </Link>
        <p
          className="font-mono text-xs mt-8 mb-2"
          style={{ color: 'var(--muted)' }}
        >
          {post.date}
        </p>
        <h1
          className="text-4xl font-black tracking-tight mb-12"
          style={{ color: 'var(--fg)' }}
        >
          {post.title}
        </h1>
        <article
          className="prose prose-neutral max-w-none"
          style={{ color: 'var(--fg)' }}
        >
          <MDXRemote source={post.content} />
        </article>
      </div>
    </div>
  )
}
