import type { Status } from './types'

/**
 * Wat een speler standaard doet, los van wat hij voor een los event zegt.
 * Twee velden en geen keuzelijst met samengestelde waarden: twee vinkjes lezen
 * zichzelf, een derde waarde zou uitleg vragen.
 */
export type Beschikbaarheid = { doetTrainingen: boolean; doetWedstrijden: boolean }

export function doetMee(speler: Beschikbaarheid, eventType: 'training' | 'wedstrijd'): boolean {
  return eventType === 'training' ? speler.doetTrainingen : speler.doetWedstrijden
}

/** Wat er geldt als hij niets zegt. Een melding wint hier altijd van. */
export function standaardVoor(
  speler: Beschikbaarheid,
  eventType: 'training' | 'wedstrijd',
): Status {
  return doetMee(speler, eventType) ? 'ja' : 'nee'
}
