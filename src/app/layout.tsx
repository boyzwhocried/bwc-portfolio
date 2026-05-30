import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://boyzwhocried.vercel.app'),
  title: {
    default: 'boyzwhocried',
    template: '%s | boyzwhocried',
  },
  description: 'data engineer in jakarta. a playground and workshop. i build things & break a few.',
  openGraph: {
    title: 'boyzwhocried',
    description: 'data engineer in jakarta. i build things & break a few.',
    url: 'https://boyzwhocried.vercel.app',
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
  icons: {
    // the brand mascot: a flat vermilion square
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect x='14' y='14' width='72' height='72' fill='%23e84c28'/></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
