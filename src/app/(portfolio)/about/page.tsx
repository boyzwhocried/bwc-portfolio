import { Metadata } from 'next'
import AboutProfile from '@/components/sections/AboutProfile'

export const metadata: Metadata = {
  title: 'about',
  description: 'the guy who automates things nobody asked him to. a profile of verrel, data engineer in jakarta.',
}

export default function AboutPage() {
  return <AboutProfile />
}
