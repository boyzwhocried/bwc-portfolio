import { getAllBlogPosts } from '@/lib/mdx'

const BASE = 'https://boyzwhocried.xyz'

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// RSS 2.0 feed for the blog ("built & broken"). Static at build, rebuilt on deploy.
export async function GET() {
  const posts = getAllBlogPosts()

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.summary)}</description>
    </item>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>built &amp; broken</title>
    <link>${BASE}/blog</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>essays from boyzwhocried: building systems, breaking a few.</description>
    <language>en</language>
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
