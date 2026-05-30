import { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'
import DriftingSquares from '@/components/ui/DriftingSquares'

export const metadata: Metadata = {
  title: 'contact',
  description: 'hey verrel, i want to ___. get in touch.',
}

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

const SOCIALS = [
  { label: 'email', value: 'verrel.alsyoumi@gmail.com', href: 'mailto:verrel.alsyoumi@gmail.com' },
  { label: 'github', value: 'boyzwhocried', href: 'https://github.com/boyzwhocried' },
  { label: 'linkedin', value: 'boyzwhocried', href: 'https://linkedin.com/in/boyzwhocried' },
]

export default function ContactPage() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      {/* ink squares on the vermilion flood (no color detox; a11y handled via full-ink text + near-ink --muted) */}
      <DriftingSquares variant="contact" color="var(--ink)" opacity={0.06} count={6} />

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* availability status */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', marginBottom: '2.5rem' }}>
          <span>● open to: freelance · collabs · a chat</span>
          <span style={{ color: 'var(--muted)' }}>· based in jakarta (GMT+7) · usually replies within a day</span>
        </div>

        <ContactForm />

        {/* bottom: socials + closing note, fills the lower space */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-12 gap-y-6" style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--fg)' }}>
          <div className="md:col-span-7 flex flex-wrap gap-x-8 gap-y-2">
            {SOCIALS.map(({ label, value, href }) => (
              <a key={label} href={href} target={href.startsWith('mailto') ? '_self' : '_blank'} rel="noopener noreferrer" className="group transition-opacity hover:opacity-70" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label} </span>
                <span style={{ color: 'var(--fg)' }}>{value} ↗</span>
              </a>
            ))}
          </div>
          <p className="md:col-span-5 md:text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)' }}>
            no pitch decks required. a sentence is fine.
          </p>
        </div>
      </div>
    </section>
  )
}
