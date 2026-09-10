'use client'

import { useState, useTransition } from 'react'
import { haalHerstellink } from '@/app/acties/toegang'
import { KopieerKnop } from './KopieerKnop'

/**
 * Zet een herstellink klaar die de leider zelf doorstuurt. Dit is de weg
 * zolang er niet gemaild kan worden — dezelfde vorm als de aanmeldlink, want
 * het is dezelfde beweging: de app maakt hem, de leider brengt hem rond.
 */
export function HerstellinkKnop({ spelerId, naam }: { spelerId: string; naam: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [mislukt, setMislukt] = useState(false)
  const [bezig, start] = useTransition()

  if (link) {
    const bericht = [
      `Hoi ${naam},`,
      '',
      'Met deze link kies je een nieuw wachtwoord. Hij is een uur geldig en gaat één keer mee.',
      '',
      link,
    ].join('\n')

    return (
      <KopieerKnop
        tekst={bericht}
        label="Kopieer het herstelbericht"
        gelukt={`Gekopieerd — stuur het naar ${naam}`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={bezig}
        onClick={() =>
          start(async () => {
            const gemaakt = await haalHerstellink(spelerId)
            if (gemaakt) setLink(gemaakt)
            else setMislukt(true)
          })
        }
        className="min-h-8 rounded-lg border border-rand px-2.5 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst disabled:opacity-50"
      >
        {bezig ? 'Even geduld…' : 'Herstellink maken'}
      </button>
      {mislukt && (
        <p role="alert" className="text-xs text-weg-op">
          Dat lukte niet. Probeer het zo nog eens.
        </p>
      )}
    </div>
  )
}
