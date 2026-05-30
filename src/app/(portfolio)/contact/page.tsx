import { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'

export const metadata: Metadata = {
  title: 'contact',
  description: 'hey verrel, i want to ___. get in touch.',
}

const SOCIALS = [
  { label: 'email', value: 'verrel.alsyoumi@gmail.com', href: 'mailto:verrel.alsyoumi@gmail.com' },
  { label: 'github', value: 'boyzwhocried', href: 'https://github.com/boyzwhocried' },
  { label: 'linkedin', value: 'boyzwhocried', href: 'https://linkedin.com/in/boyzwhocried' },
]

export default function ContactPage() {
  return (
    <section className="min-h-screen" style={{ paddingTop: '3.5rem' }}>
      <div className="mx-auto px-6" style={{ maxWidth: '56rem', paddingTop: '3.5rem', paddingBottom: '4rem' }}>
        <ContactForm />

        {/* social links */}
        <div
          className="flex flex-wrap gap-x-8 gap-y-2"
          style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--fg)' }}
        >
          {SOCIALS.map(({ label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('mailto') ? '_self' : '_blank'}
              rel="noopener noreferrer"
              className="group transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            >
              <span style={{ color: 'var(--fg)', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}{' '}
              </span>
              <span style={{ color: 'var(--fg)' }}>{value} ↗</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
