import { Metadata } from 'next'
import PhotoGallery from '@/components/sections/PhotoGallery'

export const metadata: Metadata = {
  title: 'photography',
  description: 'a gallery. let the work breathe.',
}

export default function PhotographyPage() {
  return <PhotoGallery />
}
