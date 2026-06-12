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

// ---- Cached (slow) Spotify data: written by the spotify-sync edge function,
// read by /music from the public spotify_cache table. 0 live Spotify calls per visit.

export type TopRange = 'short_term' | 'medium_term' | 'long_term'

export interface CachedTrack {
  name: string
  artist: string
  album: string
  image: string
  url: string
  played_at?: string // recently-played only
}

export interface CachedArtist {
  name: string
  image: string
  url: string
  genre?: string
}

export interface PlaylistCard {
  id: string
  category: string // vault | rotation | special
  position: number
  name: string
  description: string | null
  image: string
  count: number
  url: string
}

export interface PlaylistFeature {
  id: string
  name: string
  description: string | null
  image: string
  count: number
  url: string
  tracks: CachedTrack[]
}

// Derived theme tags for the dominant album (spotify-sync obsession_themes key;
// tags only, lyric text is never cached or shipped).
export interface ObsessionThemesPayload {
  subject: string
  artist: string
  themes: string[]
}

export interface MusicData {
  topTracks: Record<TopRange, CachedTrack[]> | null
  topArtists: Record<TopRange, CachedArtist[]> | null
  recentlyPlayed: CachedTrack[] | null
  shelf: PlaylistCard[] | null
  thisMonth: PlaylistFeature | null
  ofInsta: PlaylistFeature | null
  obsessionThemes: ObsessionThemesPayload | null
  updatedAt: string | null
}

// Live (fast) data: now-playing + recently-played, refreshed ~30s, shared across
// all visitors via unstable_cache so Spotify load stays flat under heavy traffic.
export interface SpotifyLive {
  nowPlaying: SpotifyTrack | null
  recent: CachedTrack[]
}

export interface ContactMessage {
  name: string
  email: string
  message: string
}
