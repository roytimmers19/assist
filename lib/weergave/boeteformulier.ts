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
