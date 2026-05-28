# bwc-portfolio

Personal portfolio site. Dual-purpose: professional (projects, CV, data engineering blog) and personal (about, music, photography stubs). Each page has its own visual character.

**Live:** https://boyzwhocried.vercel.app  
**Stack:** Next.js 15 App Router, TypeScript, Tailwind v4, Framer Motion, Supabase, Spotify Web API, Vercel

---

## Pages

| Route | Theme | Character |
|-------|-------|-----------|
| `/` | swiss (dark editorial) | Bold, typographic |
| `/about` | genx (warm muted green) | Casual, introspective |
| `/projects` | mono (amber terminal) | Functional, engineering-tone |
| `/blog` | minimal (light/white) | Readable, editorial |
| `/contact` | grunge (warm dark orange) | Approachable |
| `/cv` | minimal | Print-ready resume |

Each page sets its own `data-theme` — nav, footer, and all overlays inherit that theme automatically. No hardcoded colors anywhere.

---

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Spotify keys
npm run dev
```

### Required env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REFRESH_TOKEN
```

---

## Backend

### Supabase (`bwc-portfolio` project)

| Table | Purpose |
|-------|---------|
| `projects` | 7 projects — title, description, highlights[], challenges, status, year, tags, tech_stack, live_url, github_url, featured |
| `contact_messages` | Insert-only via server action |

### Spotify

Authorization Code flow. Refresh token stored in Vercel env vars. Smart polling: 30s when playing, 2min idle, paused when tab hidden. Widget in footer — animated bars, stacked title/artist layout, truncates at 40% width.

---

## UI features

- Custom crosshair cursor (`mix-blend-mode: difference`) — enlarges on any interactive element sitewide via event delegation
- Ambient CSS blobs (home, about, contact) — per-page accent color
- Skills marquee strip (home hero) — 4x repeated, no pause-on-hover
- Framer Motion `useInView` scroll reveal on all section entries
- Mobile nav: hamburger → fullscreen overlay, staggered link fade-in, follows page theme

---

## Blog

MDX via `next-mdx-remote/rsc`. Posts in `content/blog/`. Custom `.blog-prose` CSS styles.

| Post | Status |
|------|--------|
| what i learned building a data warehouse from scratch | published |
| i built a wiki that knows everything about my life | published |
| i automated a youtube channel. here's the full pipeline | published |
| being a data engineer in Indonesia: 1yr 9mo in | published |
| hello-world | stub — expand or delete |

---

## Content rules

- No em-dashes anywhere (looks AI-written). Use commas, colons, periods, or parens.
- All text lowercase per page character voice.

---

## Deployment

Deployed on Vercel. Push to `main` triggers production deploy.  
Domain `boyzwhocried.xyz` (Hostinger) — DNS not yet wired, still on `.vercel.app`.
