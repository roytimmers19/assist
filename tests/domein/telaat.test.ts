import { describe, expect, it } from 'vitest'
import { afmeldGrens, isTeLaatAfgemeld } from '@/lib/domein/telaat'

/**
 * Voorlopige regel: voor een wedstrijd afmelden vóór woensdag, voor een
 * training vóór donderdag. De grens is de dinsdag of woensdag die aan het event
 * voorafgaat, om 23:59:59 Nederlandse tijd. Zodra de boetepot komt gaat dit
 * over op de deadline per eventtype.
 */
describe('afmeldGrens voor een wedstrijd', () => {
  const wedstrijd = (startOp: Date) => afmeldGrens({ type: 'wedstrijd', startOp })

  it('pakt de dinsdag vóór een zondagwedstrijd', () => {
    // Zondag 30 augustus 2026, 10:00 in Amsterdam.
    const grens = wedstrijd(new Date('2026-08-30T08:00:00Z'))
    expect(grens.toISOString()).toBe('2026-08-25T21:59:59.999Z') // di 25 aug 23:59 NL
  })

  it('pakt de avond ervoor bij een woensdagwedstrijd', () => {
    // Woensdag 2 september 2026, 20:00 in Amsterdam.
    const grens = wedstrijd(new Date('2026-09-02T18:00:00Z'))
    expect(grens.toISOString()).toBe('2026-09-01T21:59:59.999Z') // di 1 sep 23:59 NL
  })

  it('valt nooit ná het event, ook niet bij een dinsdagwedstrijd', () => {
    // Dinsdag 1 september 2026, 20:00 in Amsterdam: de grens van diezelfde dag
    // ligt daarna, dus telt de week ervoor.
    const start = new Date('2026-09-01T18:00:00Z')
    expect(wedstrijd(start).getTime()).toBeLessThan(start.getTime())
    expect(wedstrijd(start).toISOString()).toBe('2026-08-25T21:59:59.999Z')
  })

  it('houdt rekening met de wintertijd', () => {
    // Zondag 1 november 2026, 14:00 — na de overgang staat NL op UTC+1.
    const grens = wedstrijd(new Date('2026-11-01T13:00:00Z'))
    expect(grens.toISOString()).toBe('2026-10-27T22:59:59.999Z') // di 27 okt 23:59 NL
  })
})

describe('afmeldGrens voor een training', () => {
  const training = (startOp: Date) => afmeldGrens({ type: 'training', startOp })

  it('pakt de avond ervoor bij een donderdagtraining', () => {
    // Donderdag 3 september 2026, 18:30 in Amsterdam.
    const grens = training(new Date('2026-09-03T16:30:00Z'))
    expect(grens.toISOString()).toBe('2026-09-02T21:59:59.999Z') // wo 2 sep 23:59 NL
  })

  it('valt nooit ná het event, ook niet bij een woensdagtraining', () => {
    // Woensdag 2 september 2026, 20:00 in Amsterdam.
    const start = new Date('2026-09-02T18:00:00Z')
    expect(training(start).getTime()).toBeLessThan(start.getTime())
    expect(training(start).toISOString()).toBe('2026-08-26T21:59:59.999Z')
  })
})

describe('isTeLaatAfgemeld', () => {
  const zondag = { type: 'wedstrijd', startOp: new Date('2026-08-30T08:00:00Z') } as const
  const donderdag = { type: 'training', startOp: new Date('2026-09-03T16:30:00Z') } as const

  it('is op tijd bij afmelden voor de wedstrijd op de dinsdag zelf', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-25T20:00:00Z'), zondag)).toBe(false)
  })

  it('is te laat voor de wedstrijd vanaf woensdag', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-26T06:00:00Z'), zondag)).toBe(true)
  })

  it('is te laat bij afmelden in het weekend', () => {
    expect(isTeLaatAfgemeld(new Date('2026-08-29T12:06:00Z'), zondag)).toBe(true)
  })

  it('is op tijd voor de training op de woensdag zelf', () => {
    expect(isTeLaatAfgemeld(new Date('2026-09-02T20:00:00Z'), donderdag)).toBe(false)
  })

  it('is te laat voor de training vanaf donderdag', () => {
    expect(isTeLaatAfgemeld(new Date('2026-09-03T06:00:00Z'), donderdag)).toBe(true)
  })

  it('rekent zonder meldmoment niets af', () => {
    expect(isTeLaatAfgemeld(null, zondag)).toBe(false)
  })
})
