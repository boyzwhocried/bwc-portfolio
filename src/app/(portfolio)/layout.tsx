'use client'

import { usePathname } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'

const PATH_THEME: { prefix: string; theme: string }[] = [
  { prefix: '/about',       theme: 'genx'    },
  { prefix: '/projects',    theme: 'mono'    },
  { prefix: '/blog',        theme: 'minimal' },
  { prefix: '/contact',     theme: 'grunge'  },
  { prefix: '/cv',          theme: 'minimal' },
  { prefix: '/music',       theme: 'genx'    },
  { prefix: '/photography', theme: 'mono'    },
  { prefix: '/sandbox',     theme: 'swiss'   },
  { prefix: '/',            theme: 'swiss'   },
]

function getTheme(pathname: string): string {
  for (const { prefix, theme } of PATH_THEME) {
    if (prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')) {
      return theme
    }
  }
  return 'swiss'
}

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const theme = getTheme(pathname)

  return (
    <>
      <Nav />
      <main data-theme={theme}>{children}</main>
      <Footer />
    </>
  )
}
