# The Verse — playability refine (2026-06-18)

## Problem

"the verse" (daily song-lyric cryptogram, sandbox) plays badly. Root causes:

1. **All-or-nothing feedback.** Win fires only when the whole line hashes (`isSolved`). No per-letter signal, no resolution when the board is full-but-wrong. Player never knows if a letter is right, and (because it's too hard) rarely ever reaches the reveal — so the song is never shown.
2. **Cold open.** Daily reveals one starter letter on a single 22–58 char line. Frequency analysis (the genre's main tool, and a UI affordance) is unreliable on so little text → no foothold.
3. **Silent grid mutation.** Assigning a letter that's used elsewhere silently wipes the earlier guess; it reads like a glitch.
4. **Weak hints.** Unlimited, each reveals a *random* letter — no ladder, no song/artist help.
5. **No keyboard navigation** between boxes (delete already works), tiny tap targets.

## Decisions (owner-approved)

- **Feedback = on-demand "check" button.** Server-side `checkVerse(ref, mapping)` returns per-cipher-letter booleans + `solved`. Plaintext stays off-wire (booleans only). Live-typing feedback rejected (would make it trial-and-error). Auto-win on a fully correct board still fires.
- **Keep same-symbol fill, make it visual.** One cipher symbol = one plain letter everywhere is the cryptogram itself; kept. Selecting a letter already highlights its whole group. **Kill the silent wipe:** reusing a letter still moves it (bijection preserved) but the vacated box flashes; a letter already held by a *correct/locked* slot is refused with a flash, not stolen.
- **Opening = scaled, smart starters.** Starter count scales to the line's distinct-letter count (~22% medium/daily, ~40% easy, ~10% hard, mins 1/2/0). Letters revealed are the *useful* ones (inside short words first, then highest frequency) — deterministic, not random.
- **Hint ladder, cap 4, fixed order:** letter → letter → artist → song. Letter hints reveal the next *useful* unrevealed letter (locked once revealed). artist/song shown as text. No more unlimited random reveals.
- **Keyboard:** ←/→ walk the editable boxes; Backspace/Delete clears (existing).
- **Give up:** a "reveal answer" ends the round, shows line+song+artist (uses new `giveUpVerse`), no streak gain; daily counts as a non-win.

## Architecture

Pure logic stays in `src/lib/sandbox/cipher.ts` (TDD'd in `cipher.test.ts`); server actions in `src/actions/verse.ts` orchestrate + hold the only DB read (`verse_get` RPC, anon key + `VERSE_TOKEN` — unchanged, avoids the service-role key). Client `TheVerse.tsx` renders.

### New pure helpers (cipher.ts)
- `distinctLetterCount(line)` — distinct a–z in the line.
- `starterCount(line, ratio, min)` — scaled reveal count, clamped to distinct count.
- `rankLettersByUsefulness(line)` — plain letters best-first (short-word bucket, then freq, then alpha). Deterministic.
- `smartStarterPairs(line, cipher, n)` — top-n useful letters as `[cipher, plain]`. Replaces random `starterPairs` for starters (old fn kept for compat).
- `nextHintLetter(line, cipher, known)` — next useful unrevealed `[cipher, plain]` or null.
- `gradeMapping(mapping, trueKey)` — `{ [cipher]: boolean }` correctness vs the true key.

### Server actions (verse.ts)
- `buildPuzzle` switches to `smartStarterPairs`; daily/free pass a scaled count via `starterCount`.
- `checkVerse(ref, mapping)` → `{ ok, verdict, solved }`. `trueKey = invert(makeCipher(seed))`.
- `giveUpVerse(ref)` → `{ ok, song, artist, line }` unconditionally.
- `hintVerse(ref, hintIndex, known)` → typed `letter | artist | song` per the cap-4 ladder.

### Client (TheVerse.tsx)
- `verdict` state (cipher→bool|undefined); set by check, entry cleared when that letter changes (no stale color). Boxes: green correct, red wrong, neutral otherwise (locked stays green).
- `hintLocked` set (revealed letters lock like starters); `hintReveals` list (artist/song text).
- `flash` state for the vacated/refused box pulse.
- `status: 'playing' | 'won' | 'revealed'`; reveal card covers won + gave-up.
- Arrow-key nav over editable boxes; check / hint(n/4) / reveal-answer controls.
- Persist (daily): mapping, status, hints, streak, reveal, hintLocked, hintReveals.

## Security / tradeoff

`checkVerse` returns per-letter booleans, so a determined client could brute-force the key over many calls (~26 × distinct letters). Accepted: this is a casual sandbox toy; the song/artist reveal still gates on an actual solve or an explicit give-up; the lyric bank stays RLS-locked and the plaintext never ships unsolicited. No rate-limiting (YAGNI).

## Testing

RED→GREEN unit tests for every new pure helper. Full `vitest run` + `tsc` + `next build` green before deploy. `deploy-guard` gate, then ship to prod (master == redesign FF + push). No infra/schema changes.
