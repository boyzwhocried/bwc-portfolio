import ToyShelf from '@/components/sections/ToyShelf'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'sandbox',
  description: 'the playground. toy experiments, a bootable CRT, and whatever else.',
  path: '/sandbox',
  // toy room: reachable from the footer, kept out of search indexes
  robots: { index: false, follow: true },
})

export default function SandboxPage() {
  return <ToyShelf />
}
