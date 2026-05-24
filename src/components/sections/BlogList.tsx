import Link from 'next/link'
import { BlogPost } from '@/types'

interface BlogListProps {
  posts: BlogPost[]
}

export default function BlogList({ posts }: BlogListProps) {
  return (
    <div data-theme="minimal" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        <p
          className="font-mono text-xs uppercase tracking-widest mb-12"
          style={{ color: 'var(--muted)' }}
        >
          Blog
        </p>
        {posts.length === 0 ? (
          <p className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            No posts yet.
          </p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  <p
                    className="font-mono text-xs mb-2"
                    style={{ color: 'var(--muted)' }}
                  >
                    {post.date}
                  </p>
                  <h2
                    className="text-xl font-bold mb-1 group-hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--fg)' }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {post.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
