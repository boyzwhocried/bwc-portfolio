import Link from 'next/link'
import { BlogPost } from '@/types'
import FadeIn from '@/components/ui/FadeIn'

interface BlogListProps {
  posts: BlogPost[]
}

export default function BlogList({ posts }: BlogListProps) {
  return (
    <div data-theme="minimal" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            blog
          </p>
          <p className="text-sm mb-14" style={{ color: 'var(--muted)' }}>
            things i wrote down. mostly about data, building stuff, and whatever is on my mind.
          </p>
        </FadeIn>
        {posts.length === 0 ? (
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            nothing yet.
          </p>
        ) : (
          <ul className="space-y-0">
            {posts.map((post, i) => (
              <FadeIn key={post.slug} delay={0.08 * i}>
                <li style={{ borderBottom: '1px solid var(--border)' }}>
                  <Link href={`/blog/${post.slug}`} className="group flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 py-5 transition-opacity hover:opacity-60">
                    <h2
                      className="text-base font-semibold leading-snug"
                      style={{ color: 'var(--fg)' }}
                    >
                      {post.title}
                    </h2>
                    <span
                      className="font-mono text-xs flex-shrink-0"
                      style={{ color: 'var(--muted)' }}
                    >
                      {post.date}
                    </span>
                  </Link>
                  <p className="text-sm pb-5 -mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    {post.summary}
                  </p>
                </li>
              </FadeIn>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
