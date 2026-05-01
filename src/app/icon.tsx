import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 7,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: '-1px',
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          N
        </span>
      </div>
    ),
    { ...size },
  )
}
