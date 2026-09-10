import { DateTime } from 'luxon'
import { ZONE } from '@/lib/domein/tijd'

export function alsWandklok(moment: Date, patroon = 'HH:mm'): string {
  return DateTime.fromJSDate(moment).setZone(ZONE).setLocale('nl').toFormat(patroon)
}

/** "Zondag 30 augustus, 10:00" */
export function alsDagEnTijd(moment: Date): string {
  const dt = DateTime.fromJSDate(moment).setZone(ZONE).setLocale('nl')
  const tekst = dt.toFormat('cccc d LLLL, HH:mm')
  return tekst.charAt(0).toUpperCase() + tekst.slice(1)
}

/** "zo 30 aug" — voor rijtjes waar de kop de context al geeft. */
export function alsKorteDag(moment: Date): string {
  return DateTime.fromJSDate(moment).setZone(ZONE).setLocale('nl').toFormat('ccc d LLL')
}

/** "10:00" in Amsterdamse wandklok. */
export function alsTijd(moment: Date): string {
  return alsWandklok(moment)
}

/** "za 29 aug 14:12" — wanneer iemand zich meldde, kort genoeg voor een lijstregel. */
export function alsKortMoment(moment: Date): string {
  return `${alsKorteDag(moment)} ${alsWandklok(moment)}`
}

/** "woensdag 2 september" — kleine letter, bedoeld midden in een zin. */
export function alsDagZonderTijd(moment: Date): string {
  return DateTime.fromJSDate(moment).setZone(ZONE).setLocale('nl').toFormat('cccc d LLLL')
}
