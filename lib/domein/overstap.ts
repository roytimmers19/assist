import { alsCenten } from '../weergave/geld'

/**
 * Het overzicht uit de oude boeteapp, zoals het in
 * `scripts/boetepot-overstap.json` staat. Bij elke naam uit de oude app hoort
 * het e-mailadres van de speler hier: namen zijn in de oude app anders
 * gespeld, een adres niet.
 */
export type OverstapInvoer = {
  spelers: Record<string, string>
  boetes: { speler: string; omschrijving: string; bedrag: string; datum: string; betaald: boolean }[]
}

export type OverstapRij = {
  spelerId: string
  omschrijving: string
  bedragCent: number
  datum: string
  betaald: boolean
}

/**
 * Zet het overzicht om in rijen, of zegt wat er niet klopt. Alles of niets:
 * één onbekende naam of één onleesbaar bedrag, en er gaat niets over.
 */
export function planOverstap(
  invoer: OverstapInvoer,
  spelers: { id: string; email: string }[],
): { rijen: OverstapRij[] } | { fouten: string[] } {
  const opAdres = new Map(spelers.map((s) => [s.email.toLowerCase(), s.id]))
  const onbekend = new Set<string>()
  const fouten: string[] = []
  const rijen: OverstapRij[] = []

  invoer.boetes.forEach((boete, index) => {
    const nummer = `Boete ${index + 1}`
    const adres = invoer.spelers[boete.speler]?.toLowerCase()
    const spelerId = adres ? opAdres.get(adres) : undefined
    if (!spelerId) onbekend.add(boete.speler)

    const omschrijving = boete.omschrijving.trim()
    const bedragCent = alsCenten(boete.bedrag)
    if (bedragCent === null) fouten.push(`${nummer}: bedrag "${boete.bedrag}" is geen bedrag`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(boete.datum)) {
      fouten.push(`${nummer}: datum "${boete.datum}" is geen datum als 2026-10-01`)
    }
    if (!omschrijving) fouten.push(`${nummer}: omschrijving ontbreekt`)

    if (spelerId && bedragCent !== null) {
      rijen.push({ spelerId, omschrijving, bedragCent, datum: boete.datum, betaald: boete.betaald })
    }
  })

  const alleFouten = [...[...onbekend].map((naam) => `Onbekende naam: ${naam}`), ...fouten]
  return alleFouten.length > 0 ? { fouten: alleFouten } : { rijen }
}
