import { DateTime } from 'luxon'
import { ZONE } from './tijd'

/**
 * Een periode waarin een speler niet tot de selectie hoort. `van` en `terugOp`
 * zijn kalenderdagen als ISO-tekst ('2026-10-15'), want "tot 15 oktober" moet
 * 15 oktober blijven over een zomer-wintertijdovergang heen.
 *
 * `terugOp` is de eerste dag dat hij er wéér is, niet de laatste dag dat hij
 * weg is. De periode is daarmee half open: [van, terugOp).
 */
export type Afwezigheid = {
  spelerId: string
  van: string
  /** Leeg is een open einde. */
  terugOp: string | null
}

/** De Nederlandse kalenderdag waarop een moment valt. */
export function dagVan(moment: Date): string {
  return DateTime.fromJSDate(moment).setZone(ZONE).toISODate() as string
}

/**
 * ISO-dagen zijn zo geschreven dat ze op tekst vergelijken zoals ze op datum
 * vergelijken; daarom staat hier geen datumrekenwerk.
 */
export function isAfwezigOp(periode: Afwezigheid, moment: Date): boolean {
  const dag = dagVan(moment)
  if (dag < periode.van) return false
  return periode.terugOp === null || dag < periode.terugOp
}

/**
 * Wie hoort er op dit moment bij de selectie. Dit is het enige begrip dat de
 * schermen mogen gebruiken; wie de kale spelerslijst doorgeeft slaat de
 * afwezigheid stilletjes over.
 */
export function selectieVoor(
  spelerIds: string[],
  periodes: Afwezigheid[],
  moment: Date,
): string[] {
  const weg = new Set(periodes.filter((p) => isAfwezigOp(p, moment)).map((p) => p.spelerId))
  return spelerIds.filter((id) => !weg.has(id))
}
