import { Metadata } from 'next'
import { getAllBlogPosts } from '@/lib/mdx'
import BlogList from '@/components/sections/BlogList'

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Writing on data engineering, building things, and more.',
}

export default function BlogPage() {
  const posts = getAllBlogPosts()
  return <BlogList posts={posts} />
}
