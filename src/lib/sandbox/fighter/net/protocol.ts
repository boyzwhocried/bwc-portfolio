import { REDUNDANCY, type Packet } from './lockstep'

// Everything that crosses the wire. parseMessage is the only door in: anything odd becomes null.
export type Msg =
  | { t: 'in'; packet: Packet }
  | { t: 'start'; seed: number }
  | { t: 'hash'; frame: number; h: number }
  | { t: 'bye' }

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v)

// The compact form that actually goes over the channel.
export function inputMessage(packet: Packet): { t: 'in'; frame: number; bits: number; h: number[][] } {
  return { t: 'in', frame: packet.frame, bits: packet.bits, h: packet.history.map((e) => [e.frame, e.bits]) }
}

export function parseMessage(raw: unknown): Msg | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  switch (o.t) {
    case 'in': {
      if (!isInt(o.frame) || o.frame < 0 || !isInt(o.bits)) return null
      const history: Packet['history'] = []
      if (Array.isArray(o.h)) {
        for (const e of o.h.slice(0, REDUNDANCY)) {
          if (Array.isArray(e) && isInt(e[0]) && e[0] >= 0 && isInt(e[1])) history.push({ frame: e[0], bits: e[1] })
        }
      }
      return { t: 'in', packet: { frame: o.frame, bits: o.bits, history } }
    }
    case 'start':
      return isInt(o.seed) && o.seed > 0 && o.seed <= 0x7fffffff ? { t: 'start', seed: o.seed } : null
    case 'hash':
      return isInt(o.frame) && o.frame >= 0 && isInt(o.h) ? { t: 'hash', frame: o.frame, h: o.h } : null
    case 'bye':
      return { t: 'bye' }
    default:
      return null
  }
}
