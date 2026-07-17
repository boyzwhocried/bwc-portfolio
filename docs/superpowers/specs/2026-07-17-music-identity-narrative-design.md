---
title: Music page identity narrative
date: 2026-07-17
status: approved
---

# Music page identity narrative

## Problem

The music page (`src/app/(portfolio)/music/page.tsx`) has a rich data layer ("the read" /
`MusicObsession.tsx`, "the obsession log" / `ObsessionLog.tsx`) but it is entirely
behavioral: what he listens to, how his rotation shifts, mood deltas, spine artists. None
of it connects back to *who he is*. The About page (`AboutProfile.tsx`) already
establishes a throughline identity ("the guy who automates things nobody asked him to" +
"now: started pointing the same habit at his own life: a wiki that remembers everything,
a bot that runs the day, a channel that writes and uploads horror on its own.") but the
music page never draws that line, even though the obsession engine is a direct instance
of the same pattern.

Goal: make the music page's narrative more insightful about who Verrel is, not just what
he plays, without breaking the page's existing voice rules.

## Constraints (existing, discovered during research)

- Site-wide voice: third person, lowercase headlines, mono-uppercase labels, **no
  em-dash** (hard-enforced elsewhere in the repo).
- "The read" (`MusicObsession.tsx`) is explicitly labelled *"machine-read from the
  listening data, not hand-written"* — this is a deliberate, load-bearing claim
  (`obsession.ts` header comment: "No LLM, no external calls, no guessing"). Any new
  identity content must not dilute or contradict that claim.
- `obsession.ts` already avoids overclaiming on thin/coarse data (see `GENRE_WEIGHT`
  comment: mood shift stays `'steady'` unless enough known genres exist on both sides).
  New computed stats must follow the same discipline: gate on sample size, no invented
  precision.

## Design

Two independent additions.

### 1. The bridge block (hand-written, static)

A new small section, same voice as `AboutProfile.tsx` (third person, lowercase headline,
mono label), placed **right after the hero, before `ObsessionLog`** — framing, not a
coda. Purely static copy, no data dependency, cannot fail.

Copy:

> **WHY THIS ROOM EXISTS**
>
> he already builds systems that watch him. this is what happens when the habit points
> at a hobby.
>
> the same instinct that built a wiki that remembers everything and a bot that runs his
> day also built the small deterministic engine below: it reads his own spotify history
> and tells you, in his own patterns, what currently owns him. nobody asked for this
> page. that's rather the point.

Optional closing line: a quiet `about the habit ↗` link to `/about`, matching the
existing outbound-link style (mono, `var(--accent)`, `hover:opacity-70`).

Implementation: inline block in `MusicPlayer.tsx` (matching how `BeatFeature` is already
inlined rather than a new file), OR a small standalone component if it grows. Given it's
~3 short paragraphs of static JSX, inline in `MusicPlayer.tsx` is enough — no new file
needed unless review says otherwise.

### 2. The dominance stat (computed, deterministic)

New pure functions in `src/lib/music/obsessionLog.ts`, next to the existing
`buildObsessionLog` / `logIsWorthShowing`:

```ts
export interface DominanceStat {
  active: number   // months where kind !== 'none'
  total: number
  rate: number      // active / total
}

export function dominanceRate(entries: ObsessionLogEntry[]): DominanceStat

export function dominanceClause(d: DominanceStat): string
```

`dominanceClause` buckets on `rate`, same style as the existing `MOOD_DELTA` constant in
`obsession.ts` (a named threshold, not a magic number):

- `rate >= 0.6` → "often-obsessive" tone: e.g. *"an obsession has owned {active} of the
  last {total} months tracked. when it's not one thing, it's another."*
- `rate <= 0.3` → "rarely-settles" tone: e.g. *"only {active} of the last {total} months
  tracked had a single obsession; the rest stayed wide open."*
- otherwise → "sometimes" tone, neutral, e.g. *"{active} of the last {total} months
  tracked had a single obsession running the show."*

Gated behind the **same** `logIsWorthShowing(entries)` (≥2 months) that `ObsessionLog`
already uses — no claim on a 1-month sample.

Wiring: `MusicObsession.tsx` gains a `history: HistorySnapshot[]` prop (currently only
`MusicPlayer.tsx` has it, passed to `ObsessionLog`). `MusicPlayer.tsx` passes `history`
to `MusicObsession` alongside `music`. Inside `MusicObsession`, compute
`buildObsessionLog(history)` → `dominanceRate` → `dominanceClause`, and append the
resulting sentence as the **last** paragraph after `report.paragraphs`, only when
`logIsWorthShowing` is true. No change to `report.paragraphs` itself (keeps
`obsession.ts`'s existing pure-function contract and its own tests untouched).

## Data flow

No new fetches. `history` is already fetched once in `page.tsx` via `getMusicHistory()`
and passed to `MusicPlayer`. This just threads an existing prop one level deeper.

## Error handling

- Bridge block: static JSX, cannot fail.
- Dominance clause: reuses the exact null-safety/gating pattern already proven in
  `ObsessionLog.tsx` (`logIsWorthShowing`). If history has fewer than 2 months, the
  clause simply doesn't render — same graceful-degradation discipline as the rest of the
  page.

## Testing

TDD, per project convention (`obsession.test.ts` / `obsessionLog.test.ts` already
established as the pattern for this engine):

- `dominanceRate`: 0 months (empty array), all-active, all-none, mixed — assert
  `active`/`total`/`rate` arithmetic.
- `dominanceClause`: one test per bucket boundary (`rate` just above/below 0.6 and 0.3),
  asserting the correct tone string is chosen and correctly interpolates `active`/`total`.
- No new tests needed for the bridge block (static content, no logic).

## Out of scope

- No new algorithmic signals beyond `dominanceRate` (explicitly rejected: time-of-day /
  genre-diversity metrics during brainstorming, as the underlying data is too thin/coarse
  to support a confident public claim, consistent with the engine's existing
  discipline).
- No change to `obsession.ts`'s own paragraph/placard output or its "machine-read, not
  hand-written" framing.
