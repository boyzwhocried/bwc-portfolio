import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { BlogPost, BlogPostWithContent } from '@/types'

const BLOG_DIR = path.join(process.cwd(), 'content/blog')

export function getAllBlogSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''))
}

export function getAllBlogPosts(): BlogPost[] {
  return getAllBlogSlugs()
    .map((slug) => getBlogPostMeta(slug))
    .filter((post): post is BlogPost => post !== null && post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getBlogPostMeta(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const { data } = matter(fs.readFileSync(filePath, 'utf-8'))
  return {
    slug,
    title: data.title ?? '',
    date: String(data.date ?? ''),
    tags: data.tags ?? [],
    summary: data.summary ?? '',
    published: data.published ?? false,
  }
}

export function getBlogPostWithContent(slug: string): BlogPostWithContent | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null
  const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
  return {
    slug,
    title: data.title ?? '',
    date: String(data.date ?? ''),
    tags: data.tags ?? [],
    summary: data.summary ?? '',
    published: data.published ?? false,
    content,
  }
}
