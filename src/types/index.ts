export interface Project {
  id: string
  slug: string
  title: string
  description: string
  tags: string[]
  tech_stack: string[]
  thumbnail_url: string | null
  live_url: string | null
  github_url: string | null
  featured: boolean
  order: number
  created_at: string
  long_description: string | null
  highlights: string[]
  challenges: string | null
  status: string | null
  year: number | null
}

export interface BlogPost {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  published: boolean
}

export interface BlogPostWithContent extends BlogPost {
  content: string
}

export interface SpotifyTrack {
  is_playing: boolean
  title: string
  artist: string
  album: string
  album_art_url: string
  track_url: string
}

export interface ContactMessage {
  name: string
  email: string
  message: string
}
