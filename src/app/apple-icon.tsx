import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

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
          background: '#0f2d4a',
          borderRadius: 38,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 112,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: '-4px',
            lineHeight: 1,
            marginTop: 4,
          }}
        >
          N
        </span>
      </div>
    ),
    { ...size },
  )
}
