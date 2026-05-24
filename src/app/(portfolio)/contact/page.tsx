import { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch.',
}

const SOCIALS = [
  { label: 'email', value: 'verrel.alsyoumi@gmail.com', href: 'mailto:verrel.alsyoumi@gmail.com' },
  { label: 'github', value: 'boyzwhocried', href: 'https://github.com/boyzwhocried' },
  { label: 'linkedin', value: 'boyzwhocried', href: 'https://linkedin.com/in/boyzwhocried' },
  { label: 'instagram', value: '@boyzwhocried', href: 'https://instagram.com/boyzwhocried' },
  { label: 'spotify', value: 'boyzwhocried', href: 'https://open.spotify.com/user/boyzwhocried' },
  { label: 'discord', value: 'boyzwhocried', href: null },
  { label: 'whatsapp', value: '+62 811 1340 923', href: 'https://wa.me/628111340923' },
]

export default function ContactPage() {
  return (
    <div data-theme="grunge" className="min-h-screen pt-14">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">

        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Contact
          </p>
          <p className="text-2xl font-bold mb-12" style={{ color: 'var(--fg)' }}>
            say hi
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mb-16">
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              Find me
            </p>
            <ul className="space-y-0">
              {SOCIALS.map(({ label, value, href }) => (
                <li key={label}>
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith('mailto') || href.startsWith('https://wa') ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-3 group transition-opacity hover:opacity-100"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        opacity: 0.8,
                      }}
                    >
                      <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                        {label}
                      </span>
                      <span
                        className="text-sm group-hover:underline"
                        style={{ color: 'var(--fg)' }}
                      >
                        {value} ↗
                      </span>
                    </a>
                  ) : (
                    <div
                      className="flex items-center justify-between py-3"
                      style={{ borderBottom: '1px solid var(--border)', opacity: 0.6 }}
                    >
                      <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                        {label}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--fg)' }}>
                        {value}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="font-mono text-xs uppercase tracking-widest mb-8" style={{ color: 'var(--muted)' }}>
            or send a message
          </p>
          <ContactForm />
        </FadeIn>

      </div>
    </div>
  )
}
