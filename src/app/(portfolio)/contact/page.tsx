import { Metadata } from 'next'
import ContactForm from '@/components/sections/ContactForm'
import FadeIn from '@/components/ui/FadeIn'

export const metadata: Metadata = {
  title: 'contact',
  description: 'get in touch.',
}

const SOCIALS = [
  { label: 'email', value: 'verrel.alsyoumi@gmail.com', href: 'mailto:verrel.alsyoumi@gmail.com' },
  { label: 'github', value: 'boyzwhocried', href: 'https://github.com/boyzwhocried' },
  { label: 'linkedin', value: 'boyzwhocried', href: 'https://linkedin.com/in/boyzwhocried' },
  { label: 'instagram', value: '@boyzwhocried', href: 'https://instagram.com/boyzwhocried' },
  { label: 'spotify', value: 'boyzwhocried', href: 'https://open.spotify.com/user/boyzwhocried' },
  { label: 'discord', value: 'boyzwhocried', href: 'https://discord.com/users/boyzwhocried' },
  { label: 'whatsapp', value: '+62 811 1340 923', href: 'https://wa.me/628111340923' },
]

export default function ContactPage() {
  return (
    <div data-theme="grunge" className="min-h-screen pt-14 relative overflow-hidden">

      <style>{`
        @keyframes contactBlob {
          0%   { transform: translate(0,0) scale(1);    border-radius: 50% 50% 60% 40% / 55% 45% 55% 45%; }
          40%  { transform: translate(20px,-16px) scale(1.06); border-radius: 38% 62% 48% 52% / 62% 38% 60% 40%; }
          70%  { transform: translate(-12px,10px) scale(0.96); border-radius: 64% 36% 42% 58% / 44% 56% 46% 54%; }
          100% { transform: translate(0,0) scale(1);    border-radius: 50% 50% 60% 40% / 55% 45% 55% 45%; }
        }
        .contact-blob {
          position: absolute;
          pointer-events: none;
          width: 500px;
          height: 500px;
          background: #c87840;
          bottom: -100px;
          right: -120px;
          filter: blur(100px);
          opacity: 0.08;
          will-change: transform, border-radius;
          animation: contactBlob 24s ease-in-out infinite;
        }
      `}</style>
      <div className="contact-blob" aria-hidden />

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16 relative z-10">

        <FadeIn>
          <p className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            contact
          </p>
          <p className="text-2xl font-bold mb-12" style={{ color: 'var(--fg)' }}>
            say hi
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mb-16">
            <p className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
              find me
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
                      style={{ borderBottom: '1px solid var(--border)', opacity: 0.8 }}
                    >
                      <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                        {label}
                      </span>
                      <span className="text-sm group-hover:underline" style={{ color: 'var(--fg)' }}>
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
