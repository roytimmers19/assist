'use client'

import { useState } from 'react'

type Toestand = 'rust' | 'bezig' | 'gedeeld' | 'bewaard' | 'mislukt'

const TEKST: Record<Toestand, string> = {
  rust: 'Deel de opstelling als afbeelding',
  bezig: 'Even tekenen…',
  gedeeld: 'Gedeeld',
  bewaard: 'Opgeslagen bij je downloads',
  mislukt: 'Het lukte niet — probeer het nog eens',
}

/**
 * Haalt de plaat op en geeft hem aan het deelmenu van de telefoon, zodat de
 * groepsapp er meteen tussen staat. Op een laptop bestaat dat menu niet en
 * wordt het een download; de plaat zelf is dezelfde.
 */
export function DeelPlaatKnop({
  bron,
  bestandsnaam,
  titel,
}: {
  bron: string
  bestandsnaam: string
  titel: string
}) {
  const [toestand, setToestand] = useState<Toestand>('rust')

  function terugNaarRust() {
    setTimeout(() => setToestand('rust'), 2500)
  }

  async function deel() {
    setToestand('bezig')

    try {
      const antwoord = await fetch(bron)
      if (!antwoord.ok) throw new Error(await antwoord.text())

      const plaat = await antwoord.blob()
      const bestand = new File([plaat], bestandsnaam, { type: 'image/png' })

      if (navigator.canShare?.({ files: [bestand] })) {
        await navigator.share({ files: [bestand], title: titel })
        setToestand('gedeeld')
      } else {
        const adres = URL.createObjectURL(plaat)
        const link = document.createElement('a')
        link.href = adres
        link.download = bestandsnaam
        link.click()
        URL.revokeObjectURL(adres)
        setToestand('bewaard')
      }
    } catch (fout) {
      // Het deelmenu wegtikken is geen fout, dus daar hoort ook geen melding bij.
      if (fout instanceof DOMException && fout.name === 'AbortError') {
        setToestand('rust')
        return
      }
      setToestand('mislukt')
    }

    terugNaarRust()
  }

  return (
    <button
      type="button"
      onClick={deel}
      disabled={toestand === 'bezig'}
      className={`kopregel min-h-11 w-full rounded-xl border px-4 text-sm transition-colors ${
        toestand === 'gedeeld' || toestand === 'bewaard'
          ? 'border-komt/50 bg-komt/15 text-komt-op'
          : toestand === 'mislukt'
            ? 'border-weg/50 bg-weg/15 text-weg-op'
            : 'border-rand bg-paneel-op text-tekst hover:border-club-op/60'
      }`}
    >
      {TEKST[toestand]}
    </button>
  )
}
