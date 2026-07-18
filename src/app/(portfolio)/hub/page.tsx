import HubDesktop from '@/components/sections/HubDesktop'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'hub',
  description: 'bwc.os: the launcher for everything i run. live apps, and a few private ones.',
  path: '/hub',
})

export default function HubPage() {
  return <HubDesktop />
}
