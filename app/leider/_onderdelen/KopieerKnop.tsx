'use client'

import { useState } from 'react'

export function KopieerKnop({
  tekst,
  label = 'Kopieer appje voor wie nog stil is',
  gelukt = 'Gekopieerd — plak het in de groepsapp',
}: {
  tekst: string
  label?: string
  gelukt?: string
}) {
  const [gekopieerd, setGekopieerd] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(tekst)
        setGekopieerd(true)
        setTimeout(() => setGekopieerd(false), 2000)
      }}
      className={`kopregel min-h-11 w-full rounded-xl border px-4 text-sm transition-colors ${
        gekopieerd
          ? 'border-komt/50 bg-komt/15 text-komt-op'
          : 'border-rand bg-paneel-op text-tekst hover:border-club-op/60'
      }`}
    >
      {gekopieerd ? gelukt : label}
    </button>
  )
}
