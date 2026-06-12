import { Metadata } from 'next'
import MusicPlayer from '@/components/sections/MusicPlayer'
import { getMusicData, getMusicHistory } from '@/lib/music'

export const metadata: Metadata = {
  title: 'music',
  description: 'a listening room. live from spotify, the "of insta" curation.',
}

// Re-read the cache every 5 min (the sync refreshes it on its own cron cadence).
export const revalidate = 300

export default async function MusicPage() {
  const [music, history] = await Promise.all([getMusicData(), getMusicHistory()])
  return <MusicPlayer music={music} history={history} />
}
