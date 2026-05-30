import { Metadata } from 'next'
import ToyShelf from '@/components/sections/ToyShelf'

export const metadata: Metadata = {
  title: 'sandbox',
  description: 'the playground. toy experiments, a bootable CRT, and whatever else.',
}

export default function SandboxPage() {
  return <ToyShelf />
}
