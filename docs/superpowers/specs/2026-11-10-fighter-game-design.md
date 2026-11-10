# Sandbox fighting game: design

Date: 2026-11-10. Status: DRAFT, awaiting Verrel's approval. Branch: `redesign` (push only when Verrel says; push to master deploys to prod).

## Summary

A pixel 2D fighting game (Tekken / Street Fighter feel) as a new toy in the sandbox, opened as a modal from `ToyShelf.tsx` like the other toys. Spicy Indonesian political satire, told through archetype characters, never named real people. Must play great on a phone. Single player (Arcade ladder + Quick match vs CPU) and multiplayer (local 2P, then real online with rollback netcode). Built in phases so a playable 2-fighter vertical slice exists before the roster, netcode or art polish.

## Why

Verrel wants a toy that is fun to play and sharp to look at, in the same sandbox spirit as Parry. Satire is the voice of the site's sandbox. The deterministic engine is chosen on purpose so rollback netcode, replays and ghost matches become cheap later.

## Goals

- Playable in under 3 s from opening the modal: no signup, no tutorial wall. Fight CPU first, 10 s overlay tutorial inside match one, CPU Easy by default.
- Same game, same frame data, on phone and PC. Cross-play allowed.
- Faces read as the caricatured figure ("mirip") from the face and props alone.
- Fixed-step deterministic sim: replay of the same inputs always yields the same result (tested).
- Site rules held: 3 colors only (ink `#1a1a1a`, paper `#ece7de`, vermilion `#e84c28`), no em-dashes anywhere including comments, Lighthouse accessibility stays 100.

## Non-goals

- No ranked mode, accounts, chat, or matchmaking queue (room codes only).
- No motion inputs (quarter-circles etc).
- No 3D, no AI-generated sprites.
- No claims of fact about any real person. Archetypes only.

## Anti-goals (failure even if it technically works)

- A name of a real person appearing in code, UI, repo, commits, asset names or alt text.
- Any joke about private life, family, body or health.
- Unplayable on phone, or phone players at a frame-data disadvantage.
- Netcode that desyncs silently.

## Decided by Verrel

- Modes: Single player (Arcade ladder with a satirical ending per fighter, plus Quick match vs CPU, both) and Multiplayer (local 2P on one device, and real online with rollback, not delay-based).
- Phone must work great; cross-play phone and PC is fine.
- Style: pixel 8-bit in the 3 locked colors.
- Fighters carry the real caricature face and own body, not a shared generic body. Formal look (peci / uniform cap) is the base look; hat and casual are alternate skins later.
- Satirical roster and stages from current Indonesian politics. Verrel is the publisher and owns the legal call.
- Agent-team question for the build: still open (see Open).

## My calls (not yet confirmed; flagged for Verrel to check)

1. **Input scheme:** 4 buttons (Punch, Kick, Special, Block) plus direction. Specials are direction + Special. Phone: floating left d-pad, right-thumb buttons, landscape, buttons at least 80 px, left/right-handed presets. PC: keyboard, optional gamepad later.
2. **Engine:** fixed 60 Hz, integer math, seeded RNG. Sim is a pure function `(state, inputs) -> next state` in `src/lib/sandbox/fighter/`, no DOM, no `Date`, no `Math.random`. Renderer separate in `src/components/sections/sandbox/Fighter.tsx`. Mirrors the existing Parry split (`lib/sandbox/parry` + component).
3. **Internal resolution:** about 320x180, fighters about 48x80, integer-scaled to the modal, nearest-neighbor.
4. **Art:** parts-based. Per fighter: detailed head (about 24x24), unique torso/outfit, limbs from a few pose variants. Start with 2 fighters to prove the look, then grow to 8 plus final boss.
5. **Netcode (phase 3):** own small rollback layer on the tiny sim. WebRTC peer-to-peer, Supabase Realtime for signaling only (Vercel is serverless, no game server). TURN fallback needed for roughly 10-20% of NATs. Room codes only, rate-limited room creation. Desync check: periodic state hash exchange, show "desync" and end match rather than continue silently.
6. **Persistence:** progress and settings in localStorage, wrapped in try/catch.
7. **Accessibility:** labeled touch controls, keyboard-operable menus, reduced-motion respected for screen shake and flashes.
8. **Disclaimer** visible on the toy's title screen: "fiction and satire".

## Settled after builder check (my calls, marked)

- **Colors (answered by the spike):** exactly ink, paper, vermilion. Dithering allowed for shading, no tints or extra colors.
- **Fighter moves:** every move must be expressible as a pure function of both players' inputs at the current frame, using confirmed inputs only under rollback. Move ideas such as "sees your next input early" are flavor/telegraph (my call: a visual tell from already-known frames), not true lookahead. Exact mechanics decided per fighter at phase 2 as balance work (builder).
- **Local 2P on one phone:** not supported (my call). Local 2P is PC/tablet; phones use online or CPU.
- **Phase 1 is never public** until the blind test and Verrel's explicit sign-off. It lives on `redesign`, no push (my call, matches the standing rule).
- **Signaling:** Realtime broadcast channels only, no tables, no personal data. Never the vault's `critical`/htxk instance. Use the site's own Supabase project or a new one; builder confirms which the arcade leaderboard already uses.
- **TURN:** phase 3 ships with free STUN only. Players who cannot connect see a "try another network" message (my call, zero cost). Paid TURN is a later decision.
- **Lore checking:** I verify against live sources; Verrel signs off each fighter's text before it ships.

## Art pipeline (Verrel: "you do it")

Claude produces the art in code, with a render-and-look loop. Method per head: take a public-domain reference portrait (Wikimedia Commons; identity comes from the page it was found on, never from the face), downscale and convert to exactly the 3 colors with threshold/ordered dither (Python + Pillow, already installed), then hand-clean pixels for traits (brows, lines, cap, props). Bodies, limbs and props are drawn as code pixel data. Output is a data file per fighter plus a sprite-sheet generator script, no binary editor needed. Aseprite is optional if Verrel later wants to touch up by hand. Likeness is judged only by the human blind test. References live in the vault scratchpad, not in the repo; asset names are archetype slugs only.

## Phase 1 fighters and risk tiers (my calls, Verrel: "sure")

- Phase 1: **Si Penyadap** and **Sang Ajudan**. Gemoy comes later (highest risk).
- Tiers (tier 1 = sitting president/VP): Bapak Gemoy 1, Sang Pewaris 1, Si Penyadap 2, others 3. Verrel may correct any.
- Legal note from research: the new KUHP (in force 2 Jan 2026) Art. 218 covers insulting the president and VP; reporting says it is a complaint offense only the president or VP can file, with a reported max of 3 years 6 months. A Constitutional Court ruling reportedly narrowed it (single source, Aug 2026). Sources conflict on penalty and details, so this is not settled. Not legal advice; Verrel decides.

## Animation and feel (research digest, starting points to tune by feel)

- Every move has startup, active, recovery frame counts (60 fps). Light moves: short startup and recovery. Heavy: longer recovery.
- No anticipation on player moves (responsiveness). CPU moves may telegraph.
- First active frame about 3 to 4 frames after the pose that looks like contact (one dev's finding, test it).
- Few drawn frames per move (about 3 to 6); timing carries it: wind-up held longer, action frame shortest.
- One smear frame on strikes, a second only on charged moves.
- Hitstop 2 to 4 game frames, freezes attacker and target both; one-frame flash; hit reaction 2 to 3 frames; screen shake short (4 to 8 frames), not on every hit, off under reduced-motion.
- Test light attacks at 1.25x speed to confirm they still read.

## Content rules (agreed)

- Archetype names only: Bapak Gemoy, Sang Ajudan, Mas Blusukan, Sang Pewaris, Menteri Gizi, Si Penyadap, Ibu Penyeimbang, Sang Penyeimbang Dana, Si Kabur, final boss "The System" (a composite, never a person).
- Risk tiers: (1) sitting president and VP, the new KUHP insult clause (Jan 2026) covers them; (2) people in active criminal cases, never show guilt as proven, only alleged public conduct; (3) everyone else, ordinary public-figure satire, complaints still possible. Tier shapes how hard each fighter's jokes may land.
- Jokes aim at public conduct and systems only. No invented facts. Lore is verified against sources before it ships (current research is snippets only).
- Likeness is judged by humans (blind test), never by a reviewer agent.
- Not legal advice. Verrel decides what ships.

## Roster (archetype, signature, move idea)

| Archetype | Signature | Move idea |
|---|---|---|
| Bapak Gemoy | broad face, thick brows, peci; hat skin later | cuddly dance, "Jenderal" mode at low HP |
| Sang Ajudan | young squarish face, military uniform, beret | guard stance, steps in front of the boss's hits |
| Mas Blusukan | lean narrow face, deep nose-to-mouth lines, peci | wide walkabout dash, super summons heir fighters |
| Sang Pewaris | young, polished | assist fighter, cannot be challenged on "standing" |
| Menteri Gizi | free-meal bowl | heals you then drains your wallet |
| Si Penyadap | slim face, high forehead, peaked cap, medals, earpiece wire | sees your next input early, loses when unplugged |
| Ibu Penyeimbang | red | parries, never attacks, wins on timeout |
| Sang Penyeimbang Dana | spreadsheet | hits off-screen |
| Si Kabur | Jolly Roger flag, tote bag | hit-and-run, "Kabur Aja Dulu" escape |
| The System | composite | TBD |

Status mechanic: "Report to Police" silences specials. Stages: burning forest (pale haze, dim red sun, smoke, fire at trunk bases, ash), parliament roof with allowance meter, free-meal kitchen, sovereign-fund tower, burning swamp. Forest and swamp specifics need verification before public lore.

## Phases (each ends playable)

1. **Engine + 2 fighters, local vs CPU.** Vitest TDD: replay-determinism test, hit/hurt box, block, frame data. Keyboard + touch controls. Easy CPU.
2. **Local 2P, Arcade ladder, settings, 4 more fighters, stages.**
3. **Online:** rollback layer, signaling, room codes, TURN, desync detection, cross-play.
4. **Full roster, final boss, endings, alternate skins, polish, Lighthouse + a11y pass.**

## Testing

Strict RED-GREEN TDD on the engine and rollback layer. Determinism test (same seed + inputs, N frames, identical state hash). Rollback test (late input, resim equals straight run). Playwright/manual pass on a real phone for touch. Blind likeness test with 3-4 Indonesian friends before the roster art is frozen.

## Left to the builder

Exact frame data and balance numbers, CPU AI approach, sprite sheet format and loader, audio (3-color site, sound optional and off by default), menu layout, STUN/TURN provider choice.

## Open

- Agent team for the build (engine, art data, lore/spec split)? Offered, not yet answered.
- Whether more reference photos are needed per character if "mirip" stays low (Verrel can paste labeled photos; identity comes from his label, never from a face).
- Online phase scope if TURN cost or Supabase Realtime limits bite.
- Next.js 16 has breaking changes: builder reads `node_modules/next/dist/docs/` before touching routes or client/server boundaries.
