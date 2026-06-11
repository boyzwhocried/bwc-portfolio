import { Metadata } from 'next'
import ToyShelf from '@/components/sections/ToyShelf'

export const metadata: Metadata = {
  title: 'sandbox',
  description: 'the playground. toy experiments, a bootable CRT, and whatever else.',
  // toy room: reachable from the footer, kept out of search indexes
  robots: { index: false, follow: true },
}

export default function SandboxPage() {
  return <ToyShelf />
}
