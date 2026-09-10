import type { Metadata, Viewport } from 'next'
import { Archivo, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { APPNAAM } from '@/lib/weergave/namen'

// Eén familie voor koppen en cijfers, met de breedte-as als het expressieve
// middel; een tweede, rustiger schreefloze voor lopende tekst.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
})

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  title: APPNAAM,
  description: 'SV Voorbeeld 2 — aanwezigheid en schema',
  applicationName: APPNAAM,
  appleWebApp: { capable: true, title: APPNAAM, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#0a0f1a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${archivo.variable} ${instrument.variable}`}>
      <body className="min-h-dvh bg-grond text-tekst antialiased">{children}</body>
    </html>
  )
}
