import { ImageResponse } from 'next/og'

// iOS wil een PNG voor het beginscherm; Next maakt die hier van.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#3e63ae',
        color: '#ffffff',
        fontSize: 118,
        fontWeight: 900,
      }}
    >
      2
    </div>,
    size,
  )
}
