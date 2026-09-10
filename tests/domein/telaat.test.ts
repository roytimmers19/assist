import { describe, expect, it } from 'vitest'
import { isTeLaatAfgemeld, laatsteWoensdagVoor } from '@/lib/domein/telaat'

/**
 * Voorlopige regel: afmelden moet vóór donderdag. De woensdag die aan het event
 * voorafgaat is de grens, om 23:59:59 Nederlandse tijd. Zodra de boetepot komt
 * gaat dit over op de deadline per eventtype.
 */
describe('laatsteWoensdagVoor', () => {
  it('pakt de woensdag vóór een zondagwedstrijd', () => {
    // Zondag 30 augustus 2026, 10:00 in Amsterdam.
    const grens = laatsteWoensdagVoor(new Date('2026-08-30T08:00:00Z'))
    expect(grens.toISOString()).toBe('2026-08-26T21:59:59.999Z') // wo 26 aug 23:59 NL
  })

  it('pakt de avond ervoor bij een donderdagtraining', () => {
    // Donderdag 3 september 2026, 18:30 in Amsterdam.
    const grens = laatsteWoensdagVoor(new Date('2026-09-03T16:30:00Z'))
    expect(grens.toISOString()).toBe('2026-09-02T21:59:59.999Z') // wo 2 sep 23:59 NL
  })

  it('valt nooit ná het event, ook niet bij een woensdagwedstrijd', () => {
    // Woensdag 2 september 2026, 20:00 in Amsterdam: de grens van diezelfde dag
    // ligt daarna, dus telt de week ervoor.
    const start = new Date('2026-09-02T18:00:00Z')
    expect(laatsteWoensdagVoor(start).getTime()).toBeLessThan(start.getTime())
    expect(laatsteWoensdagVoor(start).toISOString()).toBe('2026-08-26T21:59:59.999Z')
  })

  it('houdt rekening met de wintertijd', () => {
    // Zondag 1 november 2026, 14:00 — na de overgang staat NL op UTC+1.
    const grens = laatsteWoensdagVoor(new Date('2026-11-01T13:00:00Z'))
    expect(grens.toISOString()).toBe('2026-10-28T22:59:59.999Z') // wo 28 okt 23:59 NL
  })
})

describe('isTeLaatAfgemeld', () => {
  const zondag = new Date('2026-08-30T08:00:00Z')

  it('is op tijd bij afmelden op de woensdag zelf', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-26T20:00:00Z'), zondag)).toBe(false)
  })

  it('is te laat vanaf donderdag', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-27T06:00:00Z'), zondag)).toBe(true)
  })

  it('is te laat bij afmelden in het weekend', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-29T12:06:00Z'), zondag)).toBe(true)
  })

  it('rekent zonder meldmoment niets af', () => {
    expect(isTeLaatAfgemeld(null, zondag)).toBe(false)
  })
})
