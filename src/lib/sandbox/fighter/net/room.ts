// Room codes: short, typed by hand, so no look-alike characters.
export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_LEN = 5

function secureRandom(): number {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c?.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
  return Math.random()
}

export function makeRoomCode(rnd: () => number = secureRandom): string {
  let out = ''
  for (let i = 0; i < ROOM_LEN; i++) out += ROOM_ALPHABET[Math.min(ROOM_ALPHABET.length - 1, Math.floor(rnd() * ROOM_ALPHABET.length))]
  return out
}

// What a person typed -> a valid code, or null.
export function normalizeRoomCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, '')
  if (c.length !== ROOM_LEN) return null
  for (const ch of c) if (!ROOM_ALPHABET.includes(ch)) return null
  return c
}

export function channelName(code: string): string {
  return 'fighter:room:' + code
}
