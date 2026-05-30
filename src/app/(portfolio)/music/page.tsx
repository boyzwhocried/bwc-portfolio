import { Metadata } from 'next'
import MusicPlayer from '@/components/sections/MusicPlayer'

export const metadata: Metadata = {
  title: 'music',
  description: 'a listening room. live from spotify, the "of insta" curation.',
}

export default function MusicPage() {
  return <MusicPlayer />
}
