'use client'

import { useState } from 'react'
import { signOut } from '@/lib/auth/client'

/**
 * De enige uitgang. Zonder deze knop zit iemand die met het verkeerde
 * Google-account binnenkwam voorgoed vast: hij kan er niet uit, niet wisselen,
 * en alleen de leider kan hem er in de database uit halen. Op het wachtscherm
 * is dat het scherpst, want daar valt verder niets te doen.
 *
 * Na afloop een harde navigatie en geen router.push: zo blijft er geen enkele
 * pagina uit de vorige sessie in het geheugen staan.
 */
export function UitlogKnop({ toon = 'stil' }: { toon?: 'stil' | 'rand' }) {
  const [bezig, setBezig] = useState(false)

  return (
    <button
      type="button"
      disabled={bezig}
      onClick={async () => {
        setBezig(true)
        try {
          await signOut()
        } finally {
          window.location.href = '/inloggen'
        }
      }}
      className={
        toon === 'rand'
          ? 'min-h-11 w-full rounded-xl border border-rand px-4 text-sm text-zacht transition-colors hover:border-weg/50 hover:text-weg-op disabled:opacity-50'
          : 'min-h-11 text-sm text-zacht underline underline-offset-4 transition-colors hover:text-tekst disabled:opacity-50'
      }
    >
      {bezig ? 'Bezig…' : 'Uitloggen'}
    </button>
  )
}
