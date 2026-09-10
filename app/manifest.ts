import type { MetadataRoute } from 'next'
import { APPNAAM } from '@/lib/weergave/namen'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APPNAAM} — SV Voorbeeld 2`,
    short_name: APPNAAM,
    description: 'Wie er zondag speelt en wie er traint.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0f1a',
    theme_color: '#0a0f1a',
    lang: 'nl',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
