import { alsCenten } from './geld'

type Soort = { id: string; omschrijving: string; bedragCent: number; actief: boolean }

export type BoeteKeuze = { soortId: string | null; omschrijving: string; bedragCent: number }

/** Wat er mis is, zodat het scherm het in gewone taal kan zeggen. */
export type BoeteFout = { fout: 'soort' | 'omschrijving' | 'bedrag' }

/**
 * Leest "waarvoor" uit het formulier Boete geven: een vaste boete, of met
 * `anders` een eigen omschrijving en bedrag. Bij een vaste boete komen
 * omschrijving en bedrag uit de lijst, nooit uit het verzoek.
 */
export function leesBoeteKeuze(
  invoer: { soort: string; omschrijving: string; bedrag: string },
  soorten: Soort[],
): BoeteKeuze | BoeteFout {
  if (invoer.soort === 'anders') {
    const omschrijving = invoer.omschrijving.trim()
    if (!omschrijving) return { fout: 'omschrijving' }
    const bedragCent = alsCenten(invoer.bedrag)
    if (bedragCent === null) return { fout: 'bedrag' }
    return { soortId: null, omschrijving, bedragCent }
  }

  const soort = soorten.find((s) => s.id === invoer.soort && s.actief)
  if (!soort) return { fout: 'soort' }
  return { soortId: soort.id, omschrijving: soort.omschrijving, bedragCent: soort.bedragCent }
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Een id uit een verzoek, of niets. Een kapot id hoort een gewone fout te
 * geven, geen foutpagina van de database.
 */
export function alsId(waarde: string): string | null {
  return ID.test(waarde) ? waarde : null
}

/**
 * Wie de boete krijgt: elke speler één keer, en alleen wie nu in de ploeg zit.
 * Een verzoek dat iemand twee keer noemt, geeft geen twee boetes.
 */
export function kiesSpelers(gevraagd: string[], ploeg: string[]): string[] {
  const inPloeg = new Set(ploeg)
  return [...new Set(gevraagd)].filter((id) => inPloeg.has(id))
}
