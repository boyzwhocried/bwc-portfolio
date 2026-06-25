import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import JsonLd from '@/components/JsonLd'
import { personJsonLd, websiteJsonLd } from '@/lib/jsonld'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://boyzwhocried.xyz'),
  title: {
    default: 'boyzwhocried',
    template: '%s | boyzwhocried',
  },
  description: 'data engineer in jakarta. a playground and workshop. i build things & break a few.',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    title: 'boyzwhocried',
    description: 'data engineer in jakarta. i build things & break a few.',
    url: 'https://boyzwhocried.xyz',
    siteName: 'boyzwhocried',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'boyzwhocried',
    description: 'i build things & break a few.',
  },
  robots: {
    index: true,
    follow: true,
  },
  // icons come from the file convention: src/app/icon.svg (rel=icon) and
  // src/app/apple-icon.tsx (apple-touch-icon for iOS). no inline data-URI here,
  // which iOS Safari ignored and which would override the real icon files.
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var s=sessionStorage.getItem('bwc-splash-seen');var m=matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.splash=(s||m||location.pathname!=='/')?'seen':'play';}catch(e){document.documentElement.dataset.splash='seen';}",
          }}
        />
      </head>
      <body>
        <JsonLd data={personJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <div id="splash-cover" aria-hidden />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
