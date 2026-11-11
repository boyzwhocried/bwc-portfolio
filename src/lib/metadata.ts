import type { Metadata } from 'next'

type PageMetadataOptions = {
  title: string
  description: string
  path: string
  image?: string
  robots?: Metadata['robots']
  type?: 'website' | 'article'
}

export function pageMetadata({ title, description, path, image = '/opengraph-image', robots, type = 'website' }: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'boyzwhocried', type, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots,
  }
}
