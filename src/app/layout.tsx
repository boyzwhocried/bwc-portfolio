import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://boyzwhocried.xyz'),
  title: {
    default: 'boyzwhocried',
    template: '%s | boyzwhocried',
  },
  description: 'Data engineer. Frontend builder. Based in Indonesia.',
  openGraph: {
    title: 'boyzwhocried',
    description: 'Data engineer. Frontend builder. Based in Indonesia.',
    url: 'https://boyzwhocried.xyz',
    siteName: 'boyzwhocried',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'boyzwhocried',
    description: 'Data engineer. Frontend builder. Based in Indonesia.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
