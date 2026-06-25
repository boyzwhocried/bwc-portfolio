// JSON-LD structured data builders. Pure functions returning schema.org
// objects, serialized into <script type="application/ld+json"> on the relevant
// pages. This is how Google + AI Overviews resolve the site to a named human
// (E-E-A-T) and pick blog posts as citations. Keep the facts here identical to
// what is already public on /cv and /contact -- no new personal bytes.
import type { BlogPost } from '@/types'

export const SITE = {
  url: 'https://boyzwhocried.xyz',
  name: 'boyzwhocried',
  authorName: 'Verrel Mohammad Al Syoumi',
  alternateName: 'boyzwhocried',
  jobTitle: 'Data Engineer',
  sameAs: [
    'https://github.com/boyzwhocried',
    'https://linkedin.com/in/boyzwhocried',
  ],
} as const

type Json = Record<string, unknown>

/** schema.org Person -- the author identity behind the whole site. */
export function personJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE.authorName,
    alternateName: SITE.alternateName,
    url: SITE.url,
    jobTitle: SITE.jobTitle,
    sameAs: [...SITE.sameAs],
  }
}

/** schema.org WebSite, tied back to the author. */
export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    author: {
      '@type': 'Person',
      name: SITE.authorName,
      url: SITE.url,
    },
  }
}

/** schema.org BlogPosting for one post, with a named human author. */
export function blogPostingJsonLd(post: BlogPost): Json {
  const url = `${SITE.url}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: new Date(post.date).toISOString(),
    keywords: post.tags.join(', '),
    author: {
      '@type': 'Person',
      name: SITE.authorName,
      url: SITE.url,
    },
  }
}
