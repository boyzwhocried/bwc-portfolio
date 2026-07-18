import type { Metadata } from 'next'

type PageMetadataOptions = {
  title: string
  description: string
  path: string
  image?: string
  robots?: Metadata['robots']
}

export function pageMetadata({ title, description, path, image = '/opengraph-image', robots }: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'boyzwhocried', type: 'website', images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots,
  }
}
