import type { Metadata } from 'next'
import './globals.css'
import CustomCursor from '@/components/ui/CustomCursor'

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
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👾</text></svg>",
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
        <CustomCursor />
        {children}
      </body>
    </html>
  )
}
