import { Metadata } from 'next'
import { getAllBlogPostsWithReadTime } from '@/lib/mdx'
import BlogList from '@/components/sections/BlogList'

export const metadata: Metadata = {
  title: 'built & broken',
  description: 'built & broken: a one-person magazine on data, building, and chaos.',
}

export default function BlogPage() {
  const posts = getAllBlogPostsWithReadTime()
  return <BlogList posts={posts} />
}
