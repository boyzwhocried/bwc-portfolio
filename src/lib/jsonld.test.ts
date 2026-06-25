import { describe, it, expect } from 'vitest'
import { personJsonLd, websiteJsonLd, blogPostingJsonLd, SITE } from './jsonld'
import type { BlogPost } from '@/types'

describe('personJsonLd', () => {
  const p = personJsonLd()

  it('is a schema.org Person', () => {
    expect(p['@context']).toBe('https://schema.org')
    expect(p['@type']).toBe('Person')
  })

  it('carries name, jobTitle, and canonical url', () => {
    expect(p.name).toBe('Verrel Mohammad Al Syoumi')
    expect(p.jobTitle).toBe('Data Engineer')
    expect(p.url).toBe(SITE.url)
  })

  it('links verifiable profiles via sameAs', () => {
    expect(p.sameAs).toContain('https://github.com/boyzwhocried')
    expect(p.sameAs).toContain('https://linkedin.com/in/boyzwhocried')
  })
})

describe('websiteJsonLd', () => {
  const w = websiteJsonLd()

  it('is a schema.org WebSite tied to the author', () => {
    expect(w['@type']).toBe('WebSite')
    expect(w.url).toBe(SITE.url)
    expect((w.author as { name: string }).name).toBe('Verrel Mohammad Al Syoumi')
  })
})

describe('blogPostingJsonLd', () => {
  const post: BlogPost = {
    slug: 'building-personal-os',
    title: 'Building a Personal OS',
    date: '2026-06-01',
    tags: ['systems', 'llm'],
    summary: 'how i built it',
    published: true,
  }
  const a = blogPostingJsonLd(post)

  it('is a BlogPosting with an absolute canonical url', () => {
    expect(a['@type']).toBe('BlogPosting')
    expect(a.url).toBe(`${SITE.url}/blog/building-personal-os`)
    expect((a.mainEntityOfPage as { '@id': string })['@id']).toBe(
      `${SITE.url}/blog/building-personal-os`
    )
  })

  it('maps headline, description, and an ISO publish date', () => {
    expect(a.headline).toBe('Building a Personal OS')
    expect(a.description).toBe('how i built it')
    expect(a.datePublished).toBe('2026-06-01T00:00:00.000Z')
  })

  it('attributes a named human author', () => {
    expect((a.author as { '@type': string; name: string })['@type']).toBe('Person')
    expect((a.author as { name: string }).name).toBe('Verrel Mohammad Al Syoumi')
  })

  it('carries tags as keywords', () => {
    expect(a.keywords).toBe('systems, llm')
  })
})
