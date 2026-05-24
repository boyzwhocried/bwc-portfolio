import { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'

export const metadata: Metadata = {
  title: 'Contact | boyzwhocried',
  description: 'Get in touch.',
}

export default function ContactPage() {
  return (
    <div data-theme="grunge" className="min-h-screen pt-14">
      <div className="max-w-xl mx-auto px-6 pt-24 pb-16">
        <p
          className="font-mono text-xs uppercase tracking-widest mb-12"
          style={{ color: 'var(--muted)' }}
        >
          Contact
        </p>
        <ContactForm />
      </div>
    </div>
  )
}
