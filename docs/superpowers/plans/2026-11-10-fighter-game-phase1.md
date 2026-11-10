# Sandbox Fighter, Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable 2-fighter pixel fighting game toy in the sandbox: deterministic engine, CPU opponent, keyboard and touch controls, burning-forest stage, no online yet.

**Architecture:** Pure deterministic sim in `src/lib/sandbox/fighter/` (`step(state, inputs) -> state`, integer math, seeded RNG, no DOM/Date/Math.random), mirroring the Parry split. A canvas component renders state at 320x180 and integer-scales it. Input layer turns keyboard/touch into a bitmask per player per frame. Art is generated data (Pillow script + code-drawn bodies) committed as TS modules.

**Tech Stack:** Next.js 16 (read `node_modules/next/dist/docs/` before touching client/server boundaries), React 19, TypeScript, Vitest (`npm test`), HTML canvas, Python + Pillow for art generation only.

**Spec:** `docs/superpowers/specs/2026-11-10-fighter-game-design.md`. Phases 2 to 4 (local 2P + arcade + roster, online rollback, polish) get their own plans.

## Global Constraints

- Work on branch `redesign`. Commit locally. NEVER push (push to master deploys prod); Verrel decides pushes.
- No em-dashes anywhere, including code comments and commit messages.
- Exactly 3 colors: ink `#1a1a1a`, paper `#ece7de`, vermilion `#e84c28`. Dithering allowed, no tints.
- No real person's name anywhere: code, UI, assets, filenames, commits, alt text. Archetype slugs only: `si-penyadap`, `sang-ajudan`.
- Fixed 60 Hz, integer math, seeded RNG. The sim never reads `Date`, `performance`, `Math.random`, or the DOM.
- Internal resolution 320x180, fighters about 48x80, nearest-neighbor integer scaling.
- Buttons: Punch, Kick, Special, Block plus direction. No motion inputs. Touch buttons at least 80px.
- Lighthouse accessibility stays 100: labeled controls, keyboard-operable menus, `prefers-reduced-motion` disables screen shake and flashes.
- localStorage always inside try/catch. Title screen shows "fiction and satire".
- Phase 1 is never public: no push, no deploy.

## Review Focus

Failure modes the spec implies but a happy-path test would miss (each is pinned in the owning task):

1. Left and Right (or Up and Down) held together on one frame: must resolve to neutral, not drift or desync (Task 1).
2. Both fighters KO on the same frame: must be a draw/double KO, not a crash or a winner by array order (Task 3).
3. Tab hidden or CPU stall gives a huge elapsed time: the loop must cap catch-up steps, not spiral (Task 7).
4. Two thumbs on touch, a lifted or cancelled touch, orientation change mid-match: no stuck buttons (Task 8).
5. localStorage blocked or `prefers-reduced-motion` set: toy still plays, no shake or flash (Task 9).

## File Structure

- `src/lib/sandbox/fighter/types.ts` state, input bitmask constants, fighter def types
- `src/lib/sandbox/fighter/rng.ts` seeded integer RNG
- `src/lib/sandbox/fighter/sim.ts` `initMatch`, `step`, `hashState`
- `src/lib/sandbox/fighter/combat.ts` hit detection, damage, block, hitstop
- `src/lib/sandbox/fighter/match.ts` rounds, timer, KO resolution
- `src/lib/sandbox/fighter/cpu.ts` CPU input generator
- `src/lib/sandbox/fighter/roster.ts` the two fighter defs (stats and move tables)
- `src/lib/sandbox/fighter/art/` generated pixel data (`si-penyadap.ts`, `sang-ajudan.ts`, `stage-forest.ts`)
- `scripts/fighter-art/` Pillow generator (local use, not shipped)
- `src/lib/sandbox/fighter/input.ts` keyboard and touch to bitmask
- `src/components/sections/sandbox/Fighter.tsx` modal, canvas loop, title screen, tutorial
- `src/components/sections/sandbox/FighterTouchControls.tsx` on-screen d-pad and buttons
- Tests sit beside each lib file as `*.test.ts`, matching the repo.
- Modify `src/components/sections/ToyShelf.tsx` (app union near line 39, button near line 223, render near line 406).

## Tasks

### Task 1: Deterministic sim core

**Files:** Create `types.ts`, `rng.ts`, `sim.ts`; Test `sim.test.ts`, `rng.test.ts`.

**Interfaces:**
- Produces: `BTN = { LEFT:1, RIGHT:2, UP:4, DOWN:8, PUNCH:16, KICK:32, SPECIAL:64, BLOCK:128 }`; `type Inputs = [number, number]`; `type MatchState` (frame, rng seed, `fighters: [FighterState, FighterState]`, hitstop, round data); `initMatch(seed: number, defs: [FighterDef, FighterDef]): MatchState`; `step(s: MatchState, inputs: Inputs): MatchState` (pure, returns new object); `hashState(s: MatchState): number`; `nextRng(seed: number): [value: number, seed: number]`.
- World: positions in 1/256 px units, stage 320px wide, floor at fixed y, gravity and walk speed as named constants in `sim.ts`.

- [ ] **Step 1: Failing tests.** `rng.test.ts`: `same seed gives same sequence`. `sim.test.ts`: `replay is deterministic` (run 600 frames of a fixed scripted input list twice from same seed, `hashState` equal every frame); `step does not mutate its input`; `walk moves right then stops at stage wall`; `jump rises and lands on the floor in a fixed frame count`; `left and right together is neutral` (position unchanged); `up and down together is neutral`; `fighters auto-face each other and swap facing when they cross`.
- [ ] **Step 2: Run `npx vitest run src/lib/sandbox/fighter` and confirm FAIL (module not found).**
- [ ] **Step 3: Implement** `nextRng` (xorshift32, integer only), `initMatch`, `step` (movement, jump, gravity, facing, wall clamp, opposing-direction cancel), `hashState` (FNV-1a over a fixed field order). One immutable return per step.
- [ ] **Step 4: Run tests, confirm PASS.**
- [ ] **Step 5: Commit** `feat(fighter): deterministic sim core`.

### Task 2: Moves, hit detection, block, hitstop

**Files:** Create `combat.ts`; Modify `sim.ts`, `types.ts`; Test `combat.test.ts`.

**Interfaces:**
- Consumes: `step`, `FighterState` from Task 1.
- Produces: `type MoveDef = { startup, active, recovery, damage, hitstun, blockstun, knockback, hitstop, hitbox: {x,y,w,h}, kind: 'punch'|'kick'|'special' }`; `resolveHits(s: MatchState): MatchState` called inside `step` after movement; fighter states `idle|walk|jump|attack|hitstun|blockstun|ko`.
- Starting values (tune by feel, spec says so): punch 4/3/8 dmg 40; kick 7/4/14 dmg 80; hitstop 3 frames light, 4 heavy; block takes 0 damage plus chip of 10 percent; HP 1000. Player moves have no anticipation frames beyond startup.

- [ ] **Step 1: Failing tests:** `punch hitbox is active only during active frames`; `hit deals damage and puts defender in hitstun`; `both fighters freeze for hitstop frames on hit` (attacker and defender both); `block negates damage and applies chip`; `holding block while attacking does not block` (Review Focus 1 sibling: attack wins over block); `a move cannot hit twice in one swing`; `cannot act during recovery`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** the move state machine and `resolveHits` (AABB overlap, one hit per swing flag, hitstop counter that pauses both fighters' timers).
- [ ] **Step 4: Run, confirm PASS; re-run determinism test from Task 1.**
- [ ] **Step 5: Commit** `feat(fighter): moves, hits, block, hitstop`.

### Task 3: Match flow (rounds, timer, KO)

**Files:** Create `match.ts`; Modify `sim.ts`; Test `match.test.ts`.

**Interfaces:**
- Produces: `type RoundResult = 'p1' | 'p2' | 'draw' | null`; `MatchState.phase: 'intro'|'fight'|'ko'|'roundEnd'|'matchEnd'`; best of 3 rounds; round timer 99 s = 5940 frames; `matchWinner(s): 'p1'|'p2'|'draw'|null`.

- [ ] **Step 1: Failing tests:** `ko ends round and awards it`; `timeout awards round to higher hp`; `equal hp on timeout is a draw`; `both fighters ko on the same frame is a double KO draw, not a crash` (Review Focus 2); `best of three ends after two round wins`; `inputs are ignored during intro and roundEnd`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** phase transitions inside `step`; resolve simultaneous KO before winner selection.
- [ ] **Step 4: Run, confirm PASS.**
- [ ] **Step 5: Commit** `feat(fighter): rounds, timer, KO`.

### Task 4: Roster data (two fighters)

**Files:** Create `roster.ts`; Test `roster.test.ts`.

**Interfaces:**
- Produces: `FIGHTERS: Record<'si-penyadap'|'sang-ajudan', FighterDef>` with name label (archetype only), hp, walk speed, jump, `moves: Record<'punch'|'kick'|'special', MoveDef>`.
- Penyadap special: a ranged "wire" poke (flavor tell, no lookahead). Ajudan special: a forward step-in guard that absorbs one hit. Exact numbers are the builder's, tuned by feel.

- [ ] **Step 1: Failing tests:** `every move has startup >= 1 and active >= 1`; `no real person names in any def` (scan values against a short blocklist file kept out of the repo, or assert labels match `/^[A-Z][a-z]+( [A-Z][a-z]+)*$/` and equal the archetype names); `specials are not stronger than 2x kick damage`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** `roster.ts`; wire specials into `combat.ts` via def data, not special-case branches.
- [ ] **Step 4: Run all fighter tests, confirm PASS.**
- [ ] **Step 5: Commit** `feat(fighter): two-fighter roster`.

### Task 5: CPU opponent

**Files:** Create `cpu.ts`; Test `cpu.test.ts`.

**Interfaces:**
- Consumes: `MatchState`, `nextRng`.
- Produces: `cpuInput(s: MatchState, side: 0|1, level: 'easy'|'normal'): { input: number; seed: number }` pure and seeded. Easy: reacts slowly, attacks when in range at a low rate, blocks sometimes. CPU may telegraph; it never reads the player's current-frame input.

- [ ] **Step 1: Failing tests:** `same state and seed give same input`; `easy approaches when far`; `never reads inputs of the current frame` (function signature has no inputs param); `easy match vs a scripted idle player ends with CPU winning a round within 3000 frames` (smoke).
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** a small decision table keyed on distance and opponent state.
- [ ] **Step 4: Run, confirm PASS.**
- [ ] **Step 5: Commit** `feat(fighter): cpu opponent`.

### Task 6: Art data and generator

**Files:** Create `scripts/fighter-art/make_head.py`, `src/lib/sandbox/fighter/art/si-penyadap.ts`, `sang-ajudan.ts`, `stage-forest.ts`; Test `art/art.test.ts`.

**Interfaces:**
- Produces: `type Sprite = { w: number; h: number; px: Uint8Array }` with palette indices 0 transparent, 1 ink, 2 paper, 3 vermilion; per fighter `ART: { head: Sprite; body: Record<'idle'|'walk'|'punch'|'kick'|'special'|'hit'|'block'|'ko', Sprite[]>; smear: Sprite }`; `stage-forest.ts` exports a drawable layer spec (haze dither, dim sun, trunks, fire bases, ash).
- Method (spec): Pillow downscale of the public-domain reference (kept in the vault scratchpad, never in the repo) to 24x24, threshold/ordered dither to the 3 colors, then hand-cleaned traits as code overrides. Bodies and props are code-drawn. 3 to 6 drawn frames per move, one smear frame on strikes.

- [ ] **Step 1: Failing test:** `art uses only palette indices 0 to 3`; `head is 24x24, body frames are consistent size`; `every required animation has at least 1 frame`; `no file in art/ or filenames contain a blocked name` (same blocklist approach as Task 4).
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Generate** heads with the script, write the data modules, draw bodies and stage. Render a contact sheet to the scratchpad and view it; iterate until it reads. This step is visual and Verrel's blind test is the only likeness judge.
- [ ] **Step 4: Run, confirm PASS.**
- [ ] **Step 5: Commit** `feat(fighter): art data for two fighters and forest stage`.

### Task 7: Renderer and game loop

**Files:** Create `Fighter.tsx`; Test `src/lib/sandbox/fighter/loop.test.ts` for the pure loop helper.

**Interfaces:**
- Produces: `advance(accum: number, dtMs: number): { steps: number; accum: number }` in `src/lib/sandbox/fighter/loop.ts` (fixed 1000/60 ms step, caps `steps` at 5 per call); `Fighter({ onClose })` using `SandboxModal` with `fullscreen`, canvas 320x180 scaled by the largest integer that fits, `image-rendering: pixelated`.
- Draws: stage, fighters from `ART`, HP bars, timer, round pips, smear on strike frames, hitstop flash. Shake is off when reduced-motion.

- [ ] **Step 1: Failing tests:** `advance returns whole steps and carries remainder`; `a 5 second stall yields at most 5 steps` (Review Focus 3); `negative or NaN dt yields 0 steps`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** `loop.ts` then the component: requestAnimationFrame loop calling `advance`, `step`, and draw. Pause on `visibilitychange`.
- [ ] **Step 4: Run tests; run `npm run dev`, open the sandbox, confirm the match renders and runs (manual).**
- [ ] **Step 5: Commit** `feat(fighter): renderer and fixed-step loop`.

### Task 8: Input (keyboard and touch)

**Files:** Create `input.ts`, `FighterTouchControls.tsx`; Test `input.test.ts`.

**Interfaces:**
- Produces: `keysToInput(down: ReadonlySet<string>): number` (WASD + J/K/L/Space, arrows + numpad optional); `TouchState` reducer `touchReduce(state, event): TouchState` and `touchToInput(state): number`; handedness `'right'|'left'` preset mirrors layout. Floating left d-pad, right-thumb buttons, each at least 80px, `aria-label` on each, landscape layout.

- [ ] **Step 1: Failing tests:** `keys map to the right bits`; `unknown keys ignored`; `two simultaneous touches (dpad + button) both register`; `touchcancel clears that pointer's buttons` (Review Focus 4); `pointer lost on orientation change clears all held inputs`; `left-handed preset swaps sides without changing bit mapping`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** pure reducers first, then the component using pointer events (`pointerdown/up/cancel`, `setPointerCapture`), `touch-action: none`.
- [ ] **Step 4: Run tests, confirm PASS; manually verify on a real phone width via dev tools device mode.**
- [ ] **Step 5: Commit** `feat(fighter): keyboard and touch input`.

### Task 9: Toy wiring, title, tutorial, settings, a11y

**Files:** Modify `ToyShelf.tsx` (union ~39, button ~223, render ~406), `Fighter.tsx`; Create `src/lib/sandbox/fighter/settings.ts`; Test `settings.test.ts`.

**Interfaces:**
- Produces: `loadSettings(): Settings` and `saveSettings(s: Settings): void` (never throw; defaults `{ hand:'right', cpu:'easy', tutorialSeen:false }`).
- Title screen shows "fiction and satire", Fight CPU as the first and focused option, under 3 s to playable, a 10 s overlay tutorial in match one, ESC closes.

- [ ] **Step 1: Failing tests:** `loadSettings returns defaults when localStorage throws` (Review Focus 5); `loadSettings ignores corrupt JSON`; `saveSettings does not throw when storage is full`.
- [ ] **Step 2: Run, confirm FAIL.**
- [ ] **Step 3: Implement** settings, then add `'fighter'` to the `app` union and the shelf button/render in `ToyShelf.tsx` following the Parry entries. Respect `useReducedMotion` for shake and flash.
- [ ] **Step 4: Run full verification:** `npm test`, `npm run lint`, `npm run build` all pass; grep the repo diff for em-dashes (U+2014) and for blocked names (expect none); Lighthouse accessibility 100 on `/sandbox` with the toy open; play one full match with keyboard and one with touch emulation.
- [ ] **Step 5: Commit** `feat(fighter): wire toy into sandbox shelf`. Do not push.

## Self-review notes

- Spec coverage: engine, input scheme, art pipeline, phase 1 fighters, animation/feel notes, accessibility, disclaimer, no-push rule all map to tasks. Local 2P, arcade, roster, online, TURN, endings are deliberately out (phases 2 to 4).
- Types: `MatchState`, `FighterDef`, `MoveDef`, `Inputs`, `BTN` defined in Tasks 1 to 2 and reused unchanged.
- Judgment items left to the builder, per spec: exact frame data and balance, CPU decision table, audio (off, not in phase 1), menu layout.
