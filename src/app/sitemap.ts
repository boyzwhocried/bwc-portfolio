import { MetadataRoute } from 'next'
import { getAllProjects } from '@/lib/projects'
import { getAllBlogSlugs } from '@/lib/mdx'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://boyzwhocried.xyz'

  const projects = await getAllProjects()
  const projectUrls = projects.map((p) => ({
    url: `${base}/projects/${p.slug}`,
    lastModified: new Date(p.created_at),
  }))

  const blogSlugs = getAllBlogSlugs()
  const blogUrls = blogSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
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
