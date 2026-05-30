'use client'

import { useState } from 'react'

// placeholder set. real photos drop into public/photography/ at build (open-loop);
// swap each `bg` for an <img src> then. shape + flow are final now.
type Photo = { id: string; title: string; exif: string; bg: string }

const PHOTOS: Photo[] = [
  { id: 'p1', title: 'morning haze', exif: '01/24 · jakarta · 50mm f1.8', bg: 'linear-gradient(135deg,#2f2f33,#1c1c1f)' },
  { id: 'p2', title: 'rooftop blue', exif: '02/24 · jakarta · 35mm f2.0', bg: 'linear-gradient(135deg,#243038,#16202a)' },
  { id: 'p3', title: 'late train', exif: '03/24 · bandung · 50mm f1.8', bg: 'linear-gradient(135deg,#36302a,#201c18)' },
  { id: 'p4', title: 'neon alley', exif: '04/24 · jakarta · 24mm f2.8', bg: 'linear-gradient(135deg,#3a2630,#22141c)' },
  { id: 'p5', title: 'quiet harbor', exif: '05/24 · pelabuhan · 85mm f1.8', bg: 'linear-gradient(135deg,#2a3330,#161f1c)' },
  { id: 'p6', title: 'last light', exif: '06/24 · jakarta · 50mm f1.4', bg: 'linear-gradient(135deg,#3a322a,#221c16)' },
]

export default function PhotoGallery() {
  const [sel, setSel] = useState(0)
  const photo = PHOTOS[sel]

  return (
    <section style={{ paddingTop: '3.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* full-bleed main image (edge to edge) */}
      <div style={{ position: 'relative', flex: 1, minHeight: '60vh', background: photo.bg, transition: 'background .4s ease' }}>
        {/* placeholder marker (remove when a real <img> lands) */}
        <span
          aria-hidden
          style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(236,231,222,0.4)', letterSpacing: '0.1em',
          }}
        >
          [ {photo.title} ]
        </span>

        {/* EXIF caption + title, lower-left */}
        <div style={{ position: 'absolute', left: '5%', bottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.08em' }}>
            {photo.exif}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: 'var(--fg)',
              marginTop: '0.4rem',
            }}
          >
            {photo.title}
          </h1>
        </div>

        {/* counter, upper-right */}
        <div style={{ position: 'absolute', right: '5%', top: '1.25rem', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          {String(sel + 1).padStart(2, '0')} / {String(PHOTOS.length).padStart(2, '0')}
        </div>
      </div>

      {/* film-strip thumbnail rail */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ padding: '0.75rem 5%', borderTop: '1px solid var(--rule)' }}
      >
        {PHOTOS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSel(i)}
            aria-label={`view ${p.title}`}
            aria-current={i === sel}
            style={{
              flexShrink: 0,
              width: 72,
              height: 48,
              background: p.bg,
              border: i === sel ? '2px solid var(--accent)' : '1px solid var(--rule)',
              opacity: i === sel ? 1 : 0.6,
              cursor: 'pointer',
              transition: 'opacity .2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  )
}
