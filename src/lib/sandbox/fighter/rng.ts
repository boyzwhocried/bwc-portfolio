// xorshift32, integer only. Returns [value, nextSeed]; both are the same number.
export function nextRng(seed: number): [number, number] {
  let x = seed | 0
  if (x === 0) x = 1
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  x >>>= 0
  return [x, x]
}
