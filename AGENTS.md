<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# bwc-portfolio — agent working notes

Personal portfolio + multipurpose platform for Verrel (boyzwhocried). Live at https://boyzwhocried.xyz. Fast-path context for any agent session in this repo: deploy model, locked design rules, security firewall, the gotchas already solved, the verification gate. Read it before touching anything.

> Session-by-session narrative, current branch state, and long-form design specs live in the **Personal OS vault** (separate repo), not here:
> - Handoff (CONTINUE HERE block = current truth): `docs/superpowers/specs/2026-05-30-bwc-portfolio-session-handoff.md`
> - Living-site ops/skills vision: `docs/superpowers/specs/2026-05-31-bwc-living-site-ops-vision.md`
> - Memories: `project_portfolio-revival`, `project_bwc-living-site-ops`, `project_bwc-favicon-fix`

## Deploy model (read first)

- **Push to master = production deploy.** Vercel auto-deploys `master` to ALL prod domains (`boyzwhocried.xyz` + `www` + `boyzwhocried.vercel.app`). No manual promote step. Treat every push to master as shipping to prod.
- `master` and `redesign` are kept in sync. Work on `redesign`, ship via `git push origin redesign:master` (fast-forward), then `git push origin redesign`, then fast-forward local `master`.
- **Push only when the user asks.** Verify locally first (see Verification).
- DNS is on **Cloudflare, NOT Hostinger** (registrar is Hostinger but its nameservers point to Cloudflare). Cloudflare records must be **Proxy OFF / "DNS only" / grey cloud** — an orange-cloud proxied record breaks Vercel domain-verify + SSL and can cause redirect loops.

## Locked design DNA (do not re-decide)

- **3 colors only:** ink `#1a1a1a` · paper `#ece7de` · vermilion `#e84c28`. Semantic tokens (`--bg/--fg/--accent/--muted/--rule`) recolor per `[data-room]` in `globals.css`.
- **NO em-dashes anywhere, including code comments.** Use commas, colons, periods, parens, or en-dash for ranges. Hard user rule (reads as AI-written).
- **One-break-per-room:** shared chassis, each room breaks exactly one rule + one distinct entry gesture. Anti-generic gate: no dark-slate+neon, glass, glowing blobs, Inter, gradient text, bento.
- **Accent-text contrast:** small text uses `--accent-text` (AA-safe deep vermilion `#b83612` on light); bright `--accent` (`#e84c28`) only for LARGE display text + non-text marks (squares, rules, fills). Bright vermilion fails AA on paper for small text.
- **Mascot:** flat vermilion square (`src/components/ui/Square.tsx`), randomized per-load tilt via `useRandomTilt`. Self-hosted fonts in `public/fonts/`: Clash Grotesk (display), General Sans (body), Sentient (serif: /blog,/now), Space Mono (mono).
- Rooms: `/` · about · projects(+[slug]) · blog(+[slug]) · contact · cv · music · photography · hub · sandbox · now.

## Security firewall (non-negotiable)

- **Public site never carries sensitive data.** No finance/salary/family/DMs/credentials/work-internal SQL or product names. Public repo + public origin are showcase only.
- **Private apps (e.g. FinOS finance dashboard) stay auth-walled on a SEPARATE origin** with their own RLS. Never merge sensitive-data UI into this repo/origin. One RLS misconfig = a leak.
- Spotify/Supabase refresh tokens + service-role keys are **server-only**, never shipped to the client.
- Run the vault `security-check` before any publish that pulls from the wiki or adds outward-facing content.

## Stack + key paths

- Next.js `16.2.6` (App Router, Turbopack) · React `19.2.4` · Tailwind v4 · Framer Motion `12.40` · Supabase JS `2.106` · next-mdx-remote `6` · TypeScript 5 · ESLint 9.
- Supabase project `augvlmctlutjsyjgabyd` (ap-southeast-1). Tables: `projects`, `contact_messages` (insert-only), `spotify_cache` (public read), `spotify_playlists`. Spotify hybrid: live now-playing/recent via `/api/spotify/live` (`unstable_cache` 30s); slow data cached in `spotify_cache` by edge fn `spotify-sync` on a 2h pg_cron.
- `src/app/` — `(portfolio)/layout.tsx` is a CLIENT component that sets `data-room` from `usePathname`; root `layout.tsx` handles splash gating; `globals.css` holds the tokens.
- `src/components/{ui,layout,sections}/` · `src/lib/{motion.ts,spotify.ts,og.tsx,useRandomTilt.ts,useIsTouch.ts}` · `public/fonts/`.
- Icons: `src/app/{favicon.ico,icon.png,apple-icon.tsx}` + `public/apple-touch-icon.png` (see gotcha #5).

## Gotchas already solved (do not regress)

1. **Tailwind v4 Lightning CSS drops `:root` custom props** if `@media{:root{}}` blocks are nested inside `@layer base`. Page-frame tokens (`--page-max`, `--page-px`) must live in a plain top-level `:root`.
2. **Framer `whileInView` leaves below-the-fold content invisible** (initial-hidden never fires reliably). For critical content use `initial="hidden" animate="show"`, not whileInView.
3. **Inline React logical props** `paddingInline`/`marginInline` sometimes don't apply. Use explicit `paddingLeft/Right` + `marginLeft/Right`.
4. **`next/og` (OG cards + generated icons): reference each font/asset file explicitly.** A directory URL like `new URL('./og-fonts/', import.meta.url)` is unresolvable and breaks the Turbopack build. satori cannot read woff2 (instance to ttf).
5. **Favicon: NEVER ship an `icon.svg` if iOS Safari matters.** iOS Safari does not render SVG favicons, AND Next emits the svg link with `sizes="any"` which WebKit treats as the best match, so it selects the svg, fails, and shows the default icon — a raster alongside it is NOT enough. Ship raster only: `favicon.ico` (multi-size) + `icon.png` + `public/apple-touch-icon.png` (180) at the root path iOS probes. Generate rasters with `sharp` (already a dep). (Cost 3 round-trips to learn; ref: evilmartians favicon handbook.)
6. **Vercel CLI `env add` via stdin silently stores an EMPTY value.** Use `--value`. Sensitive prod/preview vars show blank on `vercel env pull` (verify by deploy behaviour, not pull).
7. `next.config.ts` pins `turbopack.root = path.resolve(__dirname)` so a stray parent `package-lock.json` doesn't make Turbopack infer the wrong workspace root.
8. There are **no `--space-*` tokens** in this repo (use inline frame styles). The top-level `not-found.tsx` is NOT wrapped by the `(portfolio)` layout, so it must import `Nav`/`Footer` directly, pass a `room` prop, and render inside a `<div data-room=...>` wrapper.

## Verification gate (token-lean)

- **The locked gate is Lighthouse accessibility 100 on every route.** Perf is NOT a gate (noisy; the splash LCP cost is accepted) — only check perf at a milestone / pre-merge.
- **Match the check to what the change can break:** touched route(s) only, unless the change hits a SHARED component (`Nav`, `Footer`, `Square`, `globals.css`) which means sweep all routes. Pure motion/logic/comment/non-contrast copy → skip a11y (it can't drop).
- **NEVER return raw Lighthouse JSON to context** (~0.5-1MB). Parse in the shell, emit only the score + failing binary-audit names:
  ```powershell
  npx lighthouse <url> --only-categories=accessibility --preset=desktop --chrome-flags="--headless=new" --output=json --output-path=lh.json --quiet
  $j = Get-Content lh.json -Raw | ConvertFrom-Json
  "a11y: " + ($j.categories.accessibility.score * 100)
  $j.audits.PSObject.Properties | Where-Object { $_.Value.scoreDisplayMode -eq 'binary' -and $_.Value.score -lt 1 } | ForEach-Object { "FAIL: " + $_.Name }
  Remove-Item lh.json
  ```
- Ignore the chrome-launcher `EPERM ... rmSync` stack dump (a Windows temp-cleanup nuisance that fires after the report is written; the score still parses).
- `npm run build` must be **0 warnings**. Sweep touched files for em-dashes (must be 0). Delete scratch verify scripts after use.

## Commits

Conventional Commits, **one commit per task**, end the body with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
