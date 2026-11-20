import { type Beschikbaarheid, standaardVoor } from './beschikbaarheid'
import { afmeldGrens } from './telaat'
import type { EventType, Melding } from './types'

type Event = { id: string; type: EventType; startOp: Date; status: 'gepland' | 'afgelast' }

/** Welke vaste boete de app voorstelt bij te laat afmelden, en sinds wanneer. */
export type Koppeling = {
  type: EventType
  soortId: string
  omschrijving: string
  bedragCent: number
  gekoppeldOp: Date
}

export type VoorstelInvoer = {
  events: Event[]
  spelers: (Beschikbaarheid & { id: string })[]
  /** Per event de meldingen, oudste eerst. */
  meldingen: Map<string, Melding[]>
  koppelingen: Koppeling[]
  /** `eventId:spelerId` waarvoor al een te-laat-boete bestaat, telt of gevallen. */
  afgehandeld: Set<string>
}

export type Voorstel = {
  eventId: string
  spelerId: string
  soortId: string
  omschrijving: string
  bedragCent: number
  afgemeldOp: Date
  reden: string | null
}

/**
 * Wie zich te laat afmeldde en daarvoor een boete voorgesteld krijgt. Er staat
 * niets van in de database: een voorstel volgt uit de meldingen, dus het
 * vervalt vanzelf als iemand zich weer aanmeldt.
 *
 * Wat telt is hoe iemand stond op het moment van de afmeldgrens. Stond hij
 * toen al op "nee", dan wist de leider het op tijd, en levert per ongeluk op
 * "ik kom" tikken en zich weer afmelden niets op.
 */
export function voorstellen(invoer: VoorstelInvoer): Voorstel[] {
  const uit: Voorstel[] = []

  for (const event of invoer.events) {
    if (event.status === 'afgelast') continue
    const koppeling = invoer.koppelingen.find((k) => k.type === event.type)
    if (!koppeling) continue

    const grens = afmeldGrens(event).getTime()
    const alleMeldingen = invoer.meldingen.get(event.id) ?? []

    for (const speler of invoer.spelers) {
      if (invoer.afgehandeld.has(`${event.id}:${speler.id}`)) continue

      const eigen = alleMeldingen
        .filter((m) => m.spelerId === speler.id)
        .sort((a, b) => a.gezetOp.getTime() - b.gezetOp.getTime())
      if (eigen.length === 0 || eigen[eigen.length - 1].status !== 'nee') continue

      const voorGrens = eigen.filter((m) => m.gezetOp.getTime() <= grens)
      const standBijGrens = voorGrens.at(-1)?.status ?? standaardVoor(speler, event.type)
      if (standBijGrens !== 'ja') continue

      // De vroegste melding van de reeks "nee" waarmee het nu eindigt.
      let begin = eigen.length - 1
      while (begin > 0 && eigen[begin - 1].status === 'nee') begin -= 1
      const afmelding = eigen[begin]

      if (afmelding.bron !== 'speler') continue
      if (afmelding.gezetOp.getTime() <= grens) continue
      if (afmelding.gezetOp.getTime() < koppeling.gekoppeldOp.getTime()) continue

      uit.push({
        eventId: event.id,
        spelerId: speler.id,
        soortId: koppeling.soortId,
        omschrijving: koppeling.omschrijving,
        bedragCent: koppeling.bedragCent,
        afgemeldOp: afmelding.gezetOp,
        reden: afmelding.toelichting,
      })
    }
  }

  return uit
}
