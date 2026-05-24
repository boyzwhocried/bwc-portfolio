import { MetadataRoute } from 'next'
import { getAllProjects } from '@/lib/projects'
import { getAllBlogPosts } from '@/lib/mdx'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://boyzwhocried.xyz'

  const projects = await getAllProjects()
  const projectUrls = projects.map((p) => ({
    url: `${base}/projects/${p.slug}`,
    lastModified: new Date(p.created_at),
  }))

  const blogPosts = getAllBlogPosts()
  const blogUrls = blogPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }))

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/projects`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    ...projectUrls,
    ...blogUrls,
  ]
}
