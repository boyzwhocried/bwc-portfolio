'use client'

import { usePathname } from 'next/navigation'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import CustomCursor from '@/components/ui/CustomCursor'

const ROOM_PREFIXES = [
  'about', 'projects', 'blog', 'contact', 'cv',
  'music', 'photography', 'hub', 'now',
] as const

function getRoom(pathname: string): string {
  for (const room of ROOM_PREFIXES) {
    if (pathname === `/${room}` || pathname.startsWith(`/${room}/`)) return room
  }
  // '/' and '/sandbox' use the paper default (no token override)
  if (pathname.startsWith('/sandbox')) return 'sandbox'
  return 'home'
}

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const room = getRoom(pathname)

  return (
    <div data-room={room}>
      {/* cursor lives inside the data-room wrapper so var(--fg) recolors it per room */}
      <CustomCursor />
      <Nav room={room} />
      <main>{children}</main>
      <Footer room={room} />
    </div>
  )
}
