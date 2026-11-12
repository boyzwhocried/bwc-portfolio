import { createLockstep, pushLocal, receiveRemote, resendPacket, tryAdvance } from './lockstep'
import { inputMessage, parseMessage } from './protocol'

export const HASH_EVERY = 60 // sim frames between desync checks
export const SEND_EVERY = 3 // samples per packet: keeps us far under the Realtime message cap (history covers the gaps)
export const RESEND_MS = 100 // while stalled, repeat the newest packet at most this often
export const TIMEOUT_MS = 5000 // stalled this long with nothing heard = opponent gone

export type Status = 'playing' | 'timeout' | 'left' | 'desync'

// One side of an online match. The transport is just a send function, so tests wire two back to back.
export function createSession(side: 0 | 1, send: (msg: unknown) => void) {
  const ls = createLockstep(side)
  const localHash = new Map<number, number>()
  const remoteHash = new Map<number, number>()
  let lastHeard: number | null = null
  let lastResend = -Infinity
  let samples = 0
  let status: Status = 'playing'

  const compare = (frame: number) => {
    const l = localHash.get(frame)
    const r = remoteHash.get(frame)
    if (l === undefined || r === undefined) return
    localHash.delete(frame)
    remoteHash.delete(frame)
    if (l !== r && status === 'playing') status = 'desync'
  }

  return {
    get status(): Status {
      return status
    },
    get frame(): number {
      return ls.frame
    },
    receive(raw: unknown, now: number): void {
      const m = parseMessage(raw)
      if (!m) return
      lastHeard = now
      if (m.t === 'in') receiveRemote(ls, m.packet)
      else if (m.t === 'hash') {
        remoteHash.set(m.frame, m.h)
        compare(m.frame)
      } else if (m.t === 'bye' && status === 'playing') status = 'left'
    },
    // call once per sim frame with this frame's buttons
    sample(bits: number): void {
      if (status !== 'playing') return
      const packet = pushLocal(ls, bits)
      if (++samples % SEND_EVERY === 0) send(inputMessage(packet))
    },
    // inputs for the next sim frame as [p1, p2], or null while waiting
    advance(now: number): [number, number] | null {
      if (status !== 'playing') return null
      if (lastHeard === null) lastHeard = now
      const inputs = tryAdvance(ls)
      if (inputs) return inputs
      if (now - lastResend >= RESEND_MS) {
        const again = resendPacket(ls)
        if (again) {
          lastResend = now
          send(inputMessage(again))
        }
      }
      if (now - lastHeard > TIMEOUT_MS) status = 'timeout'
      return null
    },
    // call after each stepped frame with hashState(state)
    checkpoint(frame: number, hash: number): void {
      if (frame <= 0 || frame % HASH_EVERY !== 0) return
      localHash.set(frame, hash)
      send({ t: 'hash', frame, h: hash })
      compare(frame)
    },
    start(seed: number): void {
      send({ t: 'start', seed })
    },
    leave(): void {
      send({ t: 'bye' })
    },
  }
}

export type Session = ReturnType<typeof createSession>

export function statusLine(s: Status): string {
  switch (s) {
    case 'left':
      return 'Opponent left. You win'
    case 'timeout':
      return 'Connection lost'
    case 'desync':
      return 'Out of sync, try again'
    default:
      return ''
  }
}
