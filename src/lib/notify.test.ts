import { describe, it, expect, vi } from 'vitest'
import { buildContactPush, notifyContact } from './notify'

const msg = { name: 'Ada', email: 'ada@example.com', message: 'hello there' }

describe('buildContactPush', () => {
  it('targets the topic and carries name, email and message', () => {
    const p = buildContactPush('secret-topic', msg)
    expect(p.topic).toBe('secret-topic')
    expect(p.title).toContain('Ada')
    expect(p.message).toContain('ada@example.com')
    expect(p.message).toContain('hello there')
  })

  it('truncates long messages', () => {
    const p = buildContactPush('t', { ...msg, message: 'x'.repeat(1000) })
    expect(p.message.length).toBeLessThan(400)
    expect(p.message).toContain('…')
  })

  it('flattens newlines in the title so a name cannot break it', () => {
    const p = buildContactPush('t', { ...msg, name: 'Ada\nLovelace' })
    expect(p.title).not.toMatch(/[\r\n]/)
  })
})

describe('notifyContact', () => {
  it('is a no-op when NTFY_TOPIC is unset', async () => {
    const fetchImpl = vi.fn()
    await notifyContact(msg, { topic: undefined, fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('POSTs JSON to the ntfy server root', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    await notifyContact(msg, { topic: 'secret-topic', fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://ntfy.sh')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).topic).toBe('secret-topic')
  })

  it('honours a custom server', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true })
    await notifyContact(msg, { topic: 't', server: 'https://ntfy.example.com', fetchImpl })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://ntfy.example.com')
  })

  it('never throws when the push fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(notifyContact(msg, { topic: 't', fetchImpl })).resolves.toBeUndefined()
  })
})
