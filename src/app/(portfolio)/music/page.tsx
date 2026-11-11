import MusicPlayer from '@/components/sections/MusicPlayer'
import { getMusicData } from '@/lib/music'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'music',
  description: 'a listening room. live from spotify, the "of insta" curation.',
  path: '/music', image: '/music/opengraph-image',
})

// Re-read the cache every 5 min (the sync refreshes it on its own cron cadence).
export const revalidate = 300

export default async function MusicPage() {
  const music = await getMusicData()
  return <MusicPlayer music={music} />
}
