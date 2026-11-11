import type { ContactMessage } from '@/types'

const PREVIEW_MAX = 300

export interface ContactPush {
  topic: string
  title: string
  message: string
  tags: string[]
  priority: number
}

export function buildContactPush(topic: string, msg: ContactMessage): ContactPush {
  const name = msg.name.replace(/\s+/g, ' ').trim()
  const preview =
    msg.message.length > PREVIEW_MAX ? `${msg.message.slice(0, PREVIEW_MAX)}…` : msg.message
  return {
    topic,
    title: `New contact message from ${name}`,
    message: `${msg.email}\n\n${preview}`,
    tags: ['envelope'],
    priority: 3,
  }
}

interface NotifyOptions {
  topic?: string
  server?: string
  fetchImpl?: typeof fetch
}

// Fire-and-forget push via ntfy. Never throws: a failed notification must not
// fail the contact form. No-op when NTFY_TOPIC is unset.
export async function notifyContact(
  msg: ContactMessage,
  {
    topic = process.env.NTFY_TOPIC,
    server = process.env.NTFY_SERVER || 'https://ntfy.sh',
    fetchImpl = fetch,
  }: NotifyOptions = {}
): Promise<void> {
  if (!topic) return
  try {
    await fetchImpl(server, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildContactPush(topic, msg)),
      signal: AbortSignal.timeout(4000),
    })
  } catch {
    // swallow: message is already saved
  }
}
