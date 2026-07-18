import ContactForm from '@/components/sections/ContactForm'
import ContactPanel from '@/components/sections/ContactPanel'
import DriftingSquares from '@/components/ui/DriftingSquares'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'contact',
  description: 'hey verrel, i want to ___. get in touch.',
  path: '/contact', image: '/contact/opengraph-image',
})

const frame: React.CSSProperties = {
  maxWidth: 'var(--page-max)',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: 'var(--page-px)',
  paddingRight: 'var(--page-px)',
}

export default function ContactPage() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', paddingTop: '3.5rem' }}>
      {/* subtle ink squares on the calm paper room */}
      <DriftingSquares variant="contact" color="var(--ink)" opacity={0.04} count={6} />

      <div style={{ ...frame, position: 'relative', zIndex: 1, paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* availability status (full width, atop the split) */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg)', marginBottom: '2.5rem' }}>
          <span style={{ color: 'var(--accent-text)' }}>● open to: freelance · collabs · a chat</span>
          <span style={{ color: 'var(--muted)' }}>· based in jakarta (GMT+7) · usually replies within a day</span>
        </div>

        {/* the split: form on the calm paper left, vermilion CTA panel on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] items-stretch" style={{ gap: '2.5rem' }}>
          <ContactForm />
          <ContactPanel />
        </div>
      </div>
    </section>
  )
}
