// Lockstep input exchange for 1v1 online. No network in here: callers move Packets around.
// Local input sampled now is applied DELAY frames later, so both sides can run without waiting
// as long as packets arrive within about DELAY frames.

export const DELAY = 4
export const REDUNDANCY = 8 // each packet also carries the previous frames, so one lost packet costs nothing
const MAX_AHEAD = 120 // refuse remote frames this far past our own (garbage or a broken peer)
const MASK = 0xff // the 8 valid buttons

export type Packet = { frame: number; bits: number; history: { frame: number; bits: number }[] }

export type Lockstep = {
  side: 0 | 1
  frame: number // next sim frame to run
  nextLocal: number // frame the next local sample will apply to
  local: Map<number, number>
  remote: Map<number, number>
}

export function createLockstep(side: 0 | 1): Lockstep {
  const local = new Map<number, number>()
  const remote = new Map<number, number>()
  for (let f = 0; f < DELAY; f++) {
    local.set(f, 0)
    remote.set(f, 0)
  }
  return { side, frame: 0, nextLocal: DELAY, local, remote }
}

function packetFor(ls: Lockstep, frame: number): Packet {
  const history: Packet['history'] = []
  for (let f = Math.max(DELAY, frame - REDUNDANCY); f < frame; f++) {
    const b = ls.local.get(f)
    if (b !== undefined) history.push({ frame: f, bits: b })
  }
  return { frame, bits: ls.local.get(frame) ?? 0, history }
}

export function pushLocal(ls: Lockstep, bits: number): Packet {
  const frame = ls.nextLocal++
  ls.local.set(frame, bits & MASK)
  return packetFor(ls, frame)
}

// The newest packet again, for when we are stalled and the last one may have been lost.
export function resendPacket(ls: Lockstep): Packet | null {
  return ls.nextLocal > DELAY ? packetFor(ls, ls.nextLocal - 1) : null
}

export function receiveRemote(ls: Lockstep, p: Packet): void {
  const take = (frame: unknown, bits: unknown) => {
    if (typeof frame !== 'number' || !Number.isInteger(frame) || typeof bits !== 'number') return
    if (frame < ls.frame || frame >= ls.frame + MAX_AHEAD || ls.remote.has(frame)) return
    ls.remote.set(frame, bits & MASK)
  }
  take(p.frame, p.bits)
  if (Array.isArray(p.history)) for (const h of p.history.slice(0, REDUNDANCY)) take(h?.frame, h?.bits)
}

// Inputs for the next sim frame as [p1, p2], or null while we still wait for the opponent.
export function tryAdvance(ls: Lockstep): [number, number] | null {
  const mine = ls.local.get(ls.frame)
  const theirs = ls.remote.get(ls.frame)
  if (mine === undefined || theirs === undefined) return null
  ls.local.delete(ls.frame)
  ls.remote.delete(ls.frame)
  ls.frame++
  return ls.side === 0 ? [mine, theirs] : [theirs, mine]
}
