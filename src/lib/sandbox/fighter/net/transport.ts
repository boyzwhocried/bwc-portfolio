import { createBrowserClient } from '@/lib/supabase/browser'
import { channelName } from './room'

// Thin Supabase Realtime wrapper: one broadcast channel per room, presence to count who is in.
// No logic lives here (the session does that), so it is checked by hand with two tabs.
export type RoomHandle = {
  send: (msg: unknown) => void
  close: () => void
}

export type RoomHandlers = {
  onMessage: (raw: unknown) => void
  onPeers: (count: number) => void // people currently in the room, including us
  onStatus: (s: 'connecting' | 'ready' | 'error') => void
}

export function openRoom(code: string, h: RoomHandlers): RoomHandle {
  const client = createBrowserClient()
  const key = Math.random().toString(36).slice(2)
  const ch = client.channel(channelName(code), { config: { broadcast: { self: false, ack: false }, presence: { key } } })
  let closed = false

  ch.on('broadcast', { event: 'm' }, ({ payload }) => h.onMessage(payload))
  ch.on('presence', { event: 'sync' }, () => h.onPeers(Object.keys(ch.presenceState()).length))
  h.onStatus('connecting')
  ch.subscribe((status) => {
    if (closed) return
    if (status === 'SUBSCRIBED') {
      h.onStatus('ready')
      void ch.track({ at: Date.now() })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      h.onStatus('error')
    }
  })

  return {
    send: (msg) => {
      if (!closed) void ch.send({ type: 'broadcast', event: 'm', payload: msg })
    },
    close: () => {
      closed = true
      void client.removeChannel(ch)
    },
  }
}
