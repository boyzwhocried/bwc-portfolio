import { describe, it, expect } from 'vitest'
import { pageMetadata } from './metadata'

// Metadata['openGraph'] is a big Next.js union (OpenGraphWebsite | OpenGraphArticle | ...
// | OpenGraphMetadata with no `type` at all), so TS won't let a plain access assume `.type`
// exists without narrowing. Cast to the shape pageMetadata actually always returns.
function ogType(m: ReturnType<typeof pageMetadata>): string | undefined {
  return (m.openGraph as { type?: string } | undefined)?.type
}

describe('pageMetadata', () => {
  const base = { title: 't', description: 'd', path: '/p' }

  it('defaults openGraph.type to website', () => {
    expect(ogType(pageMetadata(base))).toBe('website')
  })

  it('accepts an explicit type override for article pages', () => {
    expect(ogType(pageMetadata({ ...base, type: 'article' }))).toBe('article')
  })
})
