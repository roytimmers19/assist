import { DateTime, type WeekdayNumbers } from 'luxon'
import { ZONE } from './tijd'
import type { EventType } from './types'

// Luxon telt maandag als 1.
const GRENSDAG: Record<EventType, WeekdayNumbers> = {
  wedstrijd: 2, // dinsdag: vóór woensdag rond
  training: 3, // woensdag: vóór donderdag rond
}

type Event = { type: EventType; startOp: Date }

/**
 * Voorlopige afmeldregel: voor een wedstrijd moet het vóór woensdag rond zijn,
 * voor een training vóór donderdag. De grens is de dinsdag of woensdag die aan
 * het event voorafgaat, om 23:59:59 Nederlandse tijd.
 *
 * Bewust in wandkloktijd en niet in uren: "dinsdag" blijft dinsdag over een
 * zomer-wintertijdovergang heen. Ligt die dag van diezelfde week ná de
 * aanvang — bij een dinsdagavondwedstrijd — dan telt de week ervoor, zodat de
 * grens nooit ná het event kan vallen.
 *
 * Eén plek voor wat de speler leest, wanneer zijn scherm zegt dat de termijn
 * verstreken is, en het stempel bij de leider — zodat fase 2 hem kan omzetten
 * naar de deadline per eventtype en dit bestand in zijn geheel kan verdwijnen.
 */
export function afmeldGrens({ type, startOp }: Event): Date {
  const start = DateTime.fromJSDate(startOp).setZone(ZONE)

  let grens = start.set({ weekday: GRENSDAG[type] }).endOf('day')
  if (grens >= start) grens = grens.minus({ weeks: 1 })

  return grens.toJSDate()
}

/** Of een afmelding na die grens binnenkwam. Zonder meldmoment: niet te laat. */
export function isTeLaatAfgemeld(gezetOp: Date | null, event: Event): boolean {
  if (!gezetOp) return false
  return gezetOp.getTime() > afmeldGrens(event).getTime()
}
