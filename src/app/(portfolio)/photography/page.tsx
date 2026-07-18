import PhotoGallery from '@/components/sections/PhotoGallery'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'photography',
  description: 'a gallery. let the work breathe.',
  path: '/photography',
})

export default function PhotographyPage() {
  return <PhotoGallery />
}
