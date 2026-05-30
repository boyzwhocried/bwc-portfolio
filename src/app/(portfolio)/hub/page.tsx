import { Metadata } from 'next'
import HubDesktop from '@/components/sections/HubDesktop'

export const metadata: Metadata = {
  title: 'hub',
  description: 'bwc.os: the launcher for everything i run. live apps, and a few private ones.',
}

export default function HubPage() {
  return <HubDesktop />
}
