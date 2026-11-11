import MusicPlayer from '@/components/sections/MusicPlayer'
import { getMusicData, getMusicHistory } from '@/lib/music'
import { getAllBlogPosts } from '@/lib/mdx'
import { getAllProjects } from '@/lib/projects'
import { pageMetadata } from '@/lib/metadata'
import type { TimelineEvent } from '@/lib/music/obsessionLog'

export const metadata = pageMetadata({
  title: 'music',
  description: 'a listening room. live from spotify, the "of insta" curation.',
  path: '/music', image: '/music/opengraph-image',
})

// Re-read the cache every 5 min (the sync refreshes it on its own cron cadence).
export const revalidate = 300

// Cross-reference for the obsession log: real site milestones, dated. Lets a
// month's entry note "that's also the month X shipped" instead of reading in
// isolation. Sparse by nature (most months won't match) and that's fine.
function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month)
}

export default async function MusicPage() {
  const [music, history, posts, projects] = await Promise.all([
    getMusicData(),
    getMusicHistory(),
    Promise.resolve(getAllBlogPosts()),
    getAllProjects().catch(() => []),
  ])

  const events: TimelineEvent[] = [
    ...posts
      .map((p) => ({ month: (p.date ?? '').slice(0, 7), label: `he published "${p.title.toLowerCase()}"` }))
      .filter((e) => isValidMonth(e.month)),
    ...projects
      .map((p) => ({ month: (p.created_at ?? '').slice(0, 7), label: `he shipped ${p.title}` }))
      .filter((e) => isValidMonth(e.month)),
  ]

  return <MusicPlayer music={music} history={history} events={events} />
}
