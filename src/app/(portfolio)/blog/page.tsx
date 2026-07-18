import { getAllBlogPostsWithReadTime } from '@/lib/mdx'
import BlogList from '@/components/sections/BlogList'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'built & broken',
  description: 'built & broken: a one-person magazine on data, building, and chaos.',
  path: '/blog', image: '/blog/opengraph-image',
})

export default function BlogPage() {
  const posts = getAllBlogPostsWithReadTime()
  return <BlogList posts={posts} />
}
