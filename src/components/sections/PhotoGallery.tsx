'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useFadeUp } from '@/lib/motion'

// real frames, shot on 35mm film (fuji c200 / kodak colorplus 200 / kodak gold 200),
// lab-scanned, resized for web. sources live off-site; EXIF stripped on import.
type Frame = {
  src: string
  alt: string
  w: number
  h: number
  stock: string
}

const FRAMES: Frame[] = [
  { src: '/photography/braga-night.jpg', alt: 'jl. braga at night: flagpoles and the curved face of a building', w: 1326, h: 2000, stock: 'fuji c200' },
  { src: '/photography/rooftops-water-tower.jpg', alt: 'rooftops, a water tower, mountains far behind', w: 2000, h: 1331, stock: 'kodak gold 200' },
  { src: '/photography/pertamina-night.jpg', alt: 'pertamina station glowing red and green at night', w: 1326, h: 2000, stock: 'fuji c200' },
  { src: '/photography/taps-and-sneakers.jpg', alt: 'afternoon light on a tap, an old washing machine, a pair of worn sneakers', w: 1326, h: 2000, stock: 'fuji c200' },
  { src: '/photography/night-wagon.jpg', alt: 'an old station wagon asleep under a streetlight', w: 2000, h: 1338, stock: 'fuji c200' },
  { src: '/photography/checkerboard-sky.jpg', alt: 'a half-empty billboard frame against the sky', w: 2000, h: 1326, stock: 'fuji c200' },
  { src: '/photography/dusk-silhouette.jpg', alt: 'a silhouette exhaling smoke into the dusk', w: 2000, h: 1326, stock: 'kodak colorplus 200' },
  { src: '/photography/supermarket-corridor.jpg', alt: 'supermarket fridge aisle, reflected', w: 1326, h: 2000, stock: 'fuji c200' },
  { src: '/photography/blue-car.jpg', alt: 'a weathered blue car and a fallen flag', w: 2000, h: 1326, stock: 'kodak colorplus 200' },
  { src: '/photography/shell-dusk.jpg', alt: 'shell station at dusk, prices burning orange', w: 2000, h: 1326, stock: 'kodak colorplus 200' },
  { src: '/photography/landrover-alley.jpg', alt: 'an alley house with a land rover sign and parked scooters', w: 1326, h: 2000, stock: 'kodak colorplus 200' },
  { src: '/photography/dj-decks.jpg', alt: 'hands on the decks, a macbook, a batik tablecloth', w: 1600, h: 2000, stock: 'fuji c200' },
  { src: '/photography/dirt-road-sign.jpg', alt: 'a dirt road, a crossing sign, the city far below', w: 2000, h: 1326, stock: 'kodak colorplus 200' },
  { src: '/photography/watchtower.jpg', alt: 'an empty watchtower with a plastic chair, barbed wire', w: 2000, h: 1326, stock: 'fuji c200' },
  { src: '/photography/converse-rack.jpg', alt: 'a converse drying on the rack, shot through glass', w: 1326, h: 2000, stock: 'fuji c200' },
]

const pad = (n: number) => String(n).padStart(2, '0')

export default function PhotoGallery() {
  const fade = useFadeUp()

  return (
    <section style={{ paddingTop: '3.5rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* dark wall: the frames hang on ink */}
      <div style={{ position: 'relative', flex: 1, background: 'var(--ink)', paddingBottom: '3rem' }}>
        {/* header row */}
        <div
          className="flex items-end justify-between"
          style={{ padding: '2.5rem 5% 1.75rem', borderBottom: '1px solid #34322d' }}
        >
          <div>
            <div className="uppercase" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--vermilion)', letterSpacing: '0.12em' }}>
              /photography
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: 'var(--paper)',
                marginTop: '0.5rem',
              }}
            >
              shot on film
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#9a9489', marginTop: '0.75rem', lineHeight: 1.6, maxWidth: '34rem' }}>
              35mm, lab-scanned. streets, stations, and still lifes, mostly bandung and jakarta.
              no stock, no fakes.
            </p>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9a9489', whiteSpace: 'nowrap' }}>
            {pad(FRAMES.length)} / {pad(FRAMES.length)}
          </div>
        </div>

        {/* the wall: column masonry, frames keep native aspect */}
        <div className="columns-1 sm:columns-2 lg:columns-3" style={{ padding: '2rem 5% 0', columnGap: '1.5rem' }}>
          {FRAMES.map((f, i) => (
            <motion.figure
              key={f.src}
              variants={fade}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}
            >
              <div style={{ border: '1px solid #34322d', background: '#111' }}>
                <Image
                  src={f.src}
                  alt={f.alt}
                  width={f.w}
                  height={f.h}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  quality={78}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <figcaption
                className="flex items-baseline justify-between gap-3"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#9a9489', marginTop: 8, letterSpacing: '0.04em' }}
              >
                <span style={{ color: 'var(--vermilion)' }}>{pad(i + 1)}</span>
                <span className="truncate" style={{ flex: 1 }}>{f.alt}</span>
                <span className="whitespace-nowrap uppercase" style={{ fontSize: 9 }}>{f.stock}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>

      {/* film-strip rail: the stocks these rolls were shot on */}
      <motion.div
        variants={fade}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="flex items-center justify-between gap-4"
        style={{ padding: '0.9rem 5%', borderTop: '1px solid var(--rule)' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>
          fuji c200 · kodak colorplus 200 · kodak gold 200
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
          35mm
        </span>
      </motion.div>
    </section>
  )
}
