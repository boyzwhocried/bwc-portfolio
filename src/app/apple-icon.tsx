import { ImageResponse } from 'next/og'

// iOS home-screen / Safari tab icon. iOS ignores inline-SVG icons and shows a
// black box behind transparency, so the mascot rides a solid paper tile here.
// proportions match icon.svg (the 72% vermilion square, centered).
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const PAPER = '#ece7de'
const VERMILION = '#e84c28'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: PAPER,
        }}
      >
        <div style={{ width: 130, height: 130, backgroundColor: VERMILION }} />
      </div>
    ),
    size,
  )
}
