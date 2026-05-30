'use server'

import { createServerClient } from '@/lib/supabase/server'
import { ContactMessage } from '@/types'

export interface ContactFormState {
  success: boolean
  error: string | null
}

export async function submitContact(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = formData.get('name')?.toString().trim() ?? ''
  const email = formData.get('email')?.toString().trim() ?? ''
  const message = formData.get('message')?.toString().trim() ?? ''
  const intent = formData.get('intent')?.toString().trim() ?? ''

  if (!name || !email || !message) {
    return { success: false, error: 'all fields are required.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'that email does not look right.' }
  }

  // prepend the chosen intent so the message carries why they reached out
  const fullMessage = intent ? `[wants to ${intent}]\n\n${message}` : message
  const payload: ContactMessage = { name, email, message: fullMessage }
  const supabase = createServerClient()
  const { error } = await supabase.from('contact_messages').insert(payload)

  if (error) {
    return { success: false, error: 'Failed to send message. Try again.' }
  }

  return { success: true, error: null }
}
