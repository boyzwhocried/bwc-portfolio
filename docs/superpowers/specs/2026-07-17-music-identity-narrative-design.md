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

Two independent additions, touching two files: `MusicPlayer.tsx` gets the bridge block
(new static JSX, no prop changes to that component's own signature) and `MusicObsession.tsx`
gets the dominance-sentence wiring (new `history` prop + one appended paragraph).

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

Optional closing line: a quiet `about the habit →` link to `/about`, using the site's
**internal**-navigation convention (plain `→`, `next/link` `<Link>`, same tab — see
`AboutProfile.tsx`'s `the cv →` / `say hi →`), not the `↗` + `target="_blank"` pattern,
which the codebase reserves exclusively for links that leave the site (Spotify). Style
otherwise matches: mono, `var(--accent)`, `hover:opacity-70`.

Implementation: inline block in `MusicPlayer.tsx` (matching how `BeatFeature` is already
inlined rather than a new file), OR a small standalone component if it grows. Given it's
~3 short paragraphs of static JSX, inline in `MusicPlayer.tsx` is enough — no new file
needed unless review says otherwise.

### 2. The dominance stat (computed, deterministic)

**Revised after multi-lens review (2026-07-17): the original two-function design (below,
struck through in spirit) had no confidence floor beyond the bare 2-month
`logIsWorthShowing` display gate — at N=2, rate is always 0/.5/1.0, so it would assert a
confident "an obsession has owned 2 of the last 2 months tracked" personality claim off
two data points, directly contradicting `obsession.ts`'s own precedent
(`moodShift` requires `MOOD_MIN_KNOWN=2` *and* a delta past `MOOD_DELTA=0.12` before
asserting a direction, and stays silent otherwise). Fixed by adding a real confidence
floor, distinct from `logIsWorthShowing`'s display-only gate, and collapsing to one
function per the review's YAGNI note (only one caller existed).**

One new pure function in `src/lib/music/obsessionLog.ts`, next to the existing
`buildObsessionLog` / `logIsWorthShowing`:

```ts
// Confidence floor for asserting a dominance PATTERN (not just showing the log).
// Distinct from logIsWorthShowing's >=2 (display gate): 3 tracked months is the
// minimum before "often" / "rarely" reads as a pattern rather than a coin flip.
const DOMINANCE_MIN_MONTHS = 3
const DOMINANCE_HIGH = 0.6
const DOMINANCE_LOW = 0.3

export function dominanceSentence(entries: ObsessionLogEntry[]): string | null
```

Internally computes `active` (months where `kind !== 'none'`) and `total = entries.length`,
returns `null` if `total < DOMINANCE_MIN_MONTHS` (mirrors `moodShift`'s silent `'steady'`
return — no sentence, not a weak one), otherwise buckets on `active / total`:

- `>= DOMINANCE_HIGH` → "often-obsessive" tone: e.g. *"an obsession has owned {active} of
  the last {total} months tracked. when it's not one thing, it's another."*
- `<= DOMINANCE_LOW` → "rarely-settles" tone: e.g. *"only {active} of the last {total}
  months tracked had a single obsession; the rest stayed wide open."*
- otherwise → "sometimes" tone, neutral, e.g. *"{active} of the last {total} months
  tracked had a single obsession running the show."*

`total` counts months with an `spotify_history` snapshot, not calendar months elapsed —
the word "tracked" in every sentence variant is the deliberate hedge against a gappy sync
history being misread as a contiguous recent window.

Wiring: `MusicObsession.tsx` gains a `history: HistorySnapshot[]` prop (currently only
`MusicPlayer.tsx` has it, passed to `ObsessionLog`). `MusicPlayer.tsx` passes `history`
to `MusicObsession` alongside `music`. Inside `MusicObsession`, compute
`buildObsessionLog(history)` → `dominanceSentence`, and if non-null, append it as the
**last** paragraph after `report.paragraphs`. `dominanceSentence`'s own `null` return
*is* the gate — no separate `logIsWorthShowing` check needed at the call site, since
`DOMINANCE_MIN_MONTHS` (3) is already a stricter floor than `logIsWorthShowing`'s (2). No
change to `report.paragraphs` itself (keeps `obsession.ts`'s existing pure-function
contract and its own tests untouched).

## Data flow

No new fetches. `history` is already fetched once in `page.tsx` via `getMusicHistory()`
and passed to `MusicPlayer`. This just threads an existing prop one level deeper.

## Error handling

- Bridge block: static JSX, cannot fail.
- `dominanceSentence`: `null`-returns below `DOMINANCE_MIN_MONTHS` (3) covers both the
  empty-array case (no `NaN` bucket possible — the length check happens before any
  division) and the thin-sample case the review flagged. `MusicObsession` only appends
  when the return is non-null — same graceful-degradation discipline as the rest of the
  page, no separate gate to keep in sync.

## Testing

TDD, per project convention (`obsession.test.ts` / `obsessionLog.test.ts` already
established as the pattern for this engine):

- `dominanceSentence`: empty array → `null`; 1-2 months (below floor) → `null`; exactly
  `DOMINANCE_MIN_MONTHS` (3) at each bucket (high/low/mid) → correct tone string with
  correctly interpolated `active`/`total`; boundary values exactly at `0.6` and `0.3`.
- Component-level: `MusicObsession.tsx` currently has no component tests (only
  `obsession.ts`'s pure functions are tested). Add a minimal render test covering the new
  wiring specifically — the piece the review flagged as untested and most likely to
  actually break: (a) sentence appears as the last paragraph when `history` has ≥3
  months with a clear pattern, (b) nothing appended when `history` is empty or below the
  floor, (c) paragraph ordering (dominance sentence after, never before,
  `report.paragraphs`).
- No new tests needed for the bridge block (static content, no logic).

## Out of scope

- No new algorithmic signals beyond `dominanceSentence` (explicitly rejected: time-of-day /
  genre-diversity metrics during brainstorming, as the underlying data is too thin/coarse
  to support a confident public claim, consistent with the engine's existing
  discipline).
- No change to `obsession.ts`'s own paragraph/placard output or its "machine-read, not
  hand-written" framing.

## Review addendum (2026-07-17)

Multi-lens review (5 lenses: correctness, completeness, redTeam, scopeCreep,
pragmaticYagni; 24 raw findings → 22 deduped) ran against the original draft. One
`CONFIRMED` high-severity finding (the confidence-floor gap above) and one `medium`
UX finding (the `↗`/internal-link mismatch) were fixed inline above. Remaining
low/medium findings not requiring a spec change: OC's review ran without access to the
live source tree and flagged several "verify against actual code" items (whether
`MusicObsession.tsx` already has a `history` prop, whether `HistorySnapshot` matches
`getMusicHistory()`'s return shape) — carry these as explicit verification steps in the
implementation plan rather than spec changes, since they're empirical checks, not design
decisions.
