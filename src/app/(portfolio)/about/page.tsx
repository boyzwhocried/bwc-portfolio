import { Metadata } from 'next'
import AboutProfile from '@/components/sections/AboutProfile'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'about',
  description: 'the guy who automates things nobody asked him to. a profile of verrel, data engineer in jakarta.',
}

type NowCurrently = { id: number; key: string; value: string; sort_order: number }

export default async function AboutPage() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('now_currently')
    .select('id, key, value, sort_order')
    .order('sort_order', { ascending: true })

  // about page is content-rich; a now_currently hiccup degrades to an empty
  // "currently" line rather than 500-ing the whole page.
  if (error) console.error('[about] now_currently fetch failed:', error.message)
  const currently: NowCurrently[] = data ?? []

  return <AboutProfile currently={currently} />
}
