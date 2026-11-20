'use client'

import { useState } from 'react'
import { zetAanwezigheidAlsLeider } from '@/app/acties/leider'

const knop =
  'min-h-8 rounded-lg border border-rand px-2.5 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst'

/**
 * Een speler af- of aanmelden vanaf het weekoverzicht. Na de afmeldgrens
 * vraagt hij eerst om bevestiging: het blijft de keuze van de leider, maar hij
 * weet wat er gebeurt, zoals een boetevoorstel.
 */
export function MeldKnop({
  eventId,
  spelerId,
  naar,
  label,
  vraag,
}: {
  eventId: string
  spelerId: string
  naar: 'ja' | 'nee'
  label: string
  /** Alleen na de afmeldgrens; anders gebeurt het meteen. */
  vraag: string | null
}) {
  const [open, setOpen] = useState(false)

  const formulier = (tekst: string, klasse: string) => (
    <form action={zetAanwezigheidAlsLeider} className="shrink-0">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="spelerId" value={spelerId} />
      <input type="hidden" name="status" value={naar} />
      <button className={klasse}>{tekst}</button>
    </form>
  )

  if (!vraag) return formulier(label, knop)

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`shrink-0 ${knop}`}>
        {label}
      </button>
    )
  }

  return (
    <div
      role="alertdialog"
      aria-label={vraag}
      className="basis-full rounded-xl border border-weg/45 bg-weg/10 p-3"
    >
      <p className="text-sm text-tekst">{vraag}</p>
      <div className="mt-3 flex gap-2">
        {formulier(
          'Ja',
          'kopregel min-h-11 rounded-xl bg-club px-5 text-sm text-white transition-colors hover:bg-club/90',
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="kopregel min-h-11 rounded-xl border border-rand bg-paneel-op px-5 text-sm text-tekst"
        >
          Nee
        </button>
      </div>
    </div>
  )
}
