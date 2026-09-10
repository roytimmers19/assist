import { describe, expect, it } from 'vitest'
import { FORMATIES, STANDAARDFORMATIE, positienaam, zoekFormatie } from '@/lib/domein/formaties'

describe('de formatiecatalogus', () => {
  it('bevat de vier formaties uit het ontwerp', () => {
    expect(FORMATIES.map((f) => f.sleutel).sort()).toEqual(['3-5-2', '4-2-3-1', '4-3-3', '4-4-2'])
  })

  it('heeft een standaardformatie die bestaat', () => {
    expect(zoekFormatie(STANDAARDFORMATIE)).not.toBeNull()
  })

  it('geeft niets terug bij een onbekende sleutel', () => {
    expect(zoekFormatie('9-1-1')).toBeNull()
  })

  // Deze vier eisen zijn de reden dat van formatie wisselen niemand van het
  // veld haalt. Ze gelden voor elke formatie die iemand ooit toevoegt.
  it.each(FORMATIES.map((f) => [f.sleutel, f] as const))('%s is goed ingetekend', (_sleutel, formatie) => {
    expect(formatie.plekken).toHaveLength(11)

    const slots = formatie.plekken.map((p) => p.slot).sort((a, b) => a - b)
    expect(slots).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    const keeper = formatie.plekken.find((p) => p.slot === 0)
    expect(keeper?.label).toBe('K')

    for (const plek of formatie.plekken) {
      expect(plek.x).toBeGreaterThanOrEqual(0)
      expect(plek.x).toBeLessThanOrEqual(100)
      expect(plek.y).toBeGreaterThanOrEqual(0)
      expect(plek.y).toBeLessThanOrEqual(100)
      expect(plek.label.length).toBeGreaterThan(0)
    }
  })

  it('zet de keeper achterin en de spits vooraan', () => {
    const drieDrie = zoekFormatie('4-3-3')!
    const keeper = drieDrie.plekken.find((p) => p.slot === 0)!
    const voorste = drieDrie.plekken.reduce((a, b) => (a.y > b.y ? a : b))
    expect(keeper.y).toBeLessThan(20)
    expect(voorste.y).toBeGreaterThan(70)
  })
})

describe('positienaam', () => {
  it('schrijft een afkorting uit', () => {
    expect(positienaam('LB')).toBe('Linksback')
    expect(positienaam('K')).toBe('Keeper')
  })

  // Bijt zodra iemand een formatie toevoegt met een label dat nog geen naam
  // heeft: dan staat er straks 'LWB' boven het keuzepaneel.
  it('kent elk label uit de catalogus', () => {
    const zonderNaam = FORMATIES.flatMap((f) =>
      f.plekken.filter((p) => positienaam(p.label) === p.label).map((p) => `${f.sleutel}/${p.label}`),
    )
    expect(zonderNaam).toEqual([])
  })

  it('valt terug op het label zelf als er niets bekend is', () => {
    expect(positienaam('XYZ')).toBe('XYZ')
  })
})
