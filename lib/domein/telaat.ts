import { DateTime } from 'luxon'
import { ZONE } from './tijd'

const WOENSDAG = 3 // Luxon telt maandag als 1

/**
 * Voorlopige afmeldregel: het moet vóór donderdag rond zijn. De grens is de
 * woensdag die aan het event voorafgaat, om 23:59:59 Nederlandse tijd.
 *
 * Bewust in wandkloktijd en niet in uren: "woensdag" blijft woensdag over een
 * zomer-wintertijdovergang heen. Ligt de woensdag van diezelfde week ná de
 * aanvang — bij een woensdagavondwedstrijd — dan telt de week ervoor, zodat de
 * grens nooit ná het event kan vallen.
 */
export function laatsteWoensdagVoor(startOp: Date): Date {
  const start = DateTime.fromJSDate(startOp).setZone(ZONE)

  let grens = start.set({ weekday: WOENSDAG }).endOf('day')
  if (grens >= start) grens = grens.minus({ weeks: 1 })

  return grens.toJSDate()
}

/** Of een afmelding na die grens binnenkwam. Zonder meldmoment: niet te laat. */
export function isTeLaatAfgemeld(gezetOp: Date | null, startOp: Date): boolean {
  if (!gezetOp) return false
  return gezetOp.getTime() > laatsteWoensdagVoor(startOp).getTime()
}

/**
 * De grens waar alles zich op richt: wat de speler leest, wanneer zijn scherm
 * zegt dat de termijn verstreken is, en het stempel bij de leider. Eén plek,
 * zodat fase 2 hem kan omzetten naar de deadline per eventtype en dit bestand
 * in zijn geheel kan verdwijnen.
 */
export function afmeldGrens(startOp: Date): Date {
  return laatsteWoensdagVoor(startOp)
}
