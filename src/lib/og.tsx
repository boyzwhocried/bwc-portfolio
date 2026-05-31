import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// 1200x630 is the standard summary_large_image canvas
export const ogSize = { width: 1200, height: 630 }
export const ogContentType = 'image/png'

// 3-color DNA only: ink / paper / vermilion
const INK = '#1a1a1a'
const PAPER = '#ece7de'
const VERMILION = '#e84c28'

// fonts live next to this module; each file referenced explicitly so Turbopack
// traces + bundles it (a directory URL is not resolvable and breaks the build)
async function loadFonts() {
  const [clash, mono] = await Promise.all([
    readFile(fileURLToPath(new URL('./og-fonts/clash.ttf', import.meta.url))),
    readFile(fileURLToPath(new URL('./og-fonts/mono.ttf', import.meta.url))),
  ])
  return [
    { name: 'Clash', data: clash, weight: 600 as const, style: 'normal' as const },
    { name: 'Mono', data: mono, weight: 400 as const, style: 'normal' as const },
  ]
}

type OGOpts = { kicker: string; title: string; subtitle: string }

export async function renderOG({ kicker, title, subtitle }: OGOpts) {
  const fonts = await loadFonts()
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: PAPER,
          color: INK,
          padding: '76px 84px',
          fontFamily: 'Mono',
          position: 'relative',
        }}
      >
        {/* ambient mascot square, off the top-right corner */}
        <div
          style={{
            position: 'absolute',
            top: -90,
            right: -70,
            width: 340,
            height: 340,
            backgroundColor: VERMILION,
            opacity: 0.14,
            transform: 'rotate(12deg)',
          }}
        />

        {/* top: mascot + kicker */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, backgroundColor: VERMILION }} />
          <div
            style={{
              marginLeft: 22,
              fontSize: 26,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: VERMILION,
            }}
          >
            {kicker}
          </div>
        </div>

        {/* headline */}
        <div
          style={{
            display: 'flex',
            fontFamily: 'Clash',
            fontSize: title.length > 36 ? 76 : 96,
            lineHeight: 1.02,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          {title}
        </div>

        {/* bottom: subtitle over a rule + signature */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.4,
              color: INK,
              maxWidth: 900,
              marginBottom: 36,
            }}
          >
            {subtitle}
          </div>
          <div style={{ width: '100%', height: 3, backgroundColor: INK, marginBottom: 24 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}>
            <div style={{ display: 'flex' }}>boyzwhocried.vercel.app</div>
            <div style={{ display: 'flex', color: VERMILION }}>data engineer, jakarta</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  )
}
