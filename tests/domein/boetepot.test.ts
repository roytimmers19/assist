import { describe, expect, it } from 'vitest'
import {
  type Boete,
  afrekenlijst,
  huidigSeizoen,
  nieuweBoetes,
  openstaandCent,
  opPopulariteit,
  potCent,
  ranglijst,
  seizoenVan,
  totaalVan,
} from '@/lib/domein/boetepot'

let volgnummer = 0
function boete(spelerId: string, bedragCent: number, extra: Partial<Boete> = {}): Boete {
  volgnummer += 1
  return {
    id: `b-${volgnummer}`,
    spelerId,
    omschrijving: 'Gele kaart',
    bedragCent,
    aantal: 1,
    datum: '2026-11-08',
    eventId: null,
    status: 'telt',
    gegevenOp: new Date('2026-11-08T15:00:00Z'),
    ingetrokkenOp: null,
    betaaldOp: null,
    ...extra,
  }
}

const ploeg = [
  { id: 'aap', naam: 'aap' },
  { id: 'noot', naam: 'noot' },
  { id: 'mies', naam: 'mies' },
  { id: 'wim', naam: 'wim' },
]

describe('het seizoen', () => {
  it('begint op 1 juli', () => {
    expect(seizoenVan('2026-06-30')).toBe(2025)
    expect(seizoenVan('2026-07-01')).toBe(2026)
    expect(seizoenVan('2027-01-15')).toBe(2026)
  })

  it('rekent het huidige seizoen in Nederlandse tijd', () => {
    // 30 juni 23:30 UTC is 1 juli 01:30 in Nederland.
    expect(huidigSeizoen(new Date('2026-06-30T23:30:00Z'))).toBe(2026)
    expect(huidigSeizoen(new Date('2026-06-30T21:00:00Z'))).toBe(2025)
  })
})

describe('de ranglijst', () => {
  it('zet het hoogste bedrag bovenaan en wie niets heeft onder nog schoon', () => {
    const lijst = ranglijst(
      [boete('aap', 3000), boete('noot', 2000), boete('mies', 1000)],
      ploeg,
      2026,
    )

    expect(lijst.plekken.map((p) => [p.naam, p.totaalCent, p.plek, p.uitgelicht])).toEqual([
      ['aap', 3000, 1, true],
      ['noot', 2000, 2, true],
      ['mies', 1000, 3, true],
    ])
    expect(lijst.schoon).toEqual(['wim'])
  })

  it('telt de boetes van één speler bij elkaar op', () => {
    const lijst = ranglijst([boete('aap', 200), boete('aap', 500)], ploeg, 2026)
    expect(lijst.plekken[0]).toMatchObject({ naam: 'aap', totaalCent: 700 })
  })

  it('laat spelers met een gelijk bedrag een plek delen, op naam', () => {
    const lijst = ranglijst(
      [boete('noot', 2000), boete('aap', 2000), boete('mies', 1000), boete('wim', 500)],
      ploeg,
      2026,
    )

    expect(lijst.plekken.map((p) => [p.naam, p.plek, p.uitgelicht])).toEqual([
      ['aap', 1, true],
      ['noot', 1, true],
      ['mies', 3, true],
      ['wim', 4, false],
    ])
  })

  it('telt ingetrokken en gevallen boetes niet mee', () => {
    const lijst = ranglijst(
      [
        boete('aap', 1000, { ingetrokkenOp: new Date('2026-11-09T10:00:00Z') }),
        boete('aap', 500, { status: 'gevallen' }),
      ],
      ploeg,
      2026,
    )

    expect(lijst.plekken).toEqual([])
    expect(lijst.schoon).toContain('aap')
  })

  it('telt alleen het gevraagde seizoen', () => {
    const lijst = ranglijst(
      [boete('aap', 1000, { datum: '2026-06-30' }), boete('aap', 200, { datum: '2026-07-01' })],
      ploeg,
      2026,
    )
    expect(lijst.plekken[0]).toMatchObject({ naam: 'aap', totaalCent: 200 })
  })

  it('blijft een speler tonen nadat hij betaald heeft', () => {
    const lijst = ranglijst(
      [boete('aap', 1200, { betaaldOp: new Date('2026-11-10T10:00:00Z') })],
      ploeg,
      2026,
    )
    expect(lijst.plekken[0]).toMatchObject({ naam: 'aap', totaalCent: 1200 })
  })
})

describe('de pot', () => {
  it('is alles wat dit seizoen aan boetes is gegeven, betaald of niet', () => {
    const boetes = [
      boete('aap', 3000),
      boete('noot', 2000, { betaaldOp: new Date('2026-11-10T10:00:00Z') }),
      boete('mies', 1000),
      boete('wim', 500, { ingetrokkenOp: new Date('2026-11-09T10:00:00Z') }),
      boete('wim', 700, { datum: '2026-06-30' }),
    ]
    expect(potCent(boetes, 2026)).toBe(6000)
  })
})

describe('wat iemand nog open heeft', () => {
  it('is wat telt en niet betaald is, over alle seizoenen', () => {
    const boetes = [
      boete('aap', 1000, { datum: '2026-06-30' }),
      boete('aap', 200, { datum: '2026-07-01' }),
      boete('aap', 500, { betaaldOp: new Date('2026-11-10T10:00:00Z') }),
      boete('aap', 300, { ingetrokkenOp: new Date('2026-11-09T10:00:00Z') }),
      boete('noot', 900),
    ]
    expect(openstaandCent('aap', boetes)).toBe(1200)
  })
})

describe('de afrekenlijst', () => {
  it('zet wie iets open heeft bovenaan, hoogste eerst, en wie alles betaalde eronder', () => {
    const vorige = new Date('2026-11-01T10:00:00Z')
    const laatste = new Date('2026-11-20T10:00:00Z')
    const lijst = afrekenlijst(
      [
        boete('aap', 200),
        boete('noot', 1750),
        boete('mies', 500, { betaaldOp: vorige }),
        boete('mies', 300, { betaaldOp: laatste }),
      ],
      ploeg,
    )

    expect(lijst.open.map((r) => [r.naam, r.openCent])).toEqual([
      ['noot', 1750],
      ['aap', 200],
    ])
    expect(lijst.afgerekend).toEqual([{ spelerId: 'mies', naam: 'mies', laatstBetaaldOp: laatste }])
  })
})

describe('nieuwe boetes op het beginscherm', () => {
  const nu = new Date('2026-11-20T12:00:00Z')

  it('toont een boete zeven dagen na het geven', () => {
    const gisteren = boete('noot', 500, { gegevenOp: new Date('2026-11-19T12:00:00Z') })
    const achtDagen = boete('noot', 500, { gegevenOp: new Date('2026-11-12T11:59:00Z') })
    expect(nieuweBoetes('noot', [gisteren, achtDagen], nu)).toEqual([gisteren])
  })

  it('toont geen ingetrokken boete en geen boete van een ander', () => {
    const ingetrokken = boete('noot', 500, {
      gegevenOp: new Date('2026-11-19T12:00:00Z'),
      ingetrokkenOp: new Date('2026-11-19T13:00:00Z'),
    })
    const vanAap = boete('aap', 500, { gegevenOp: new Date('2026-11-19T12:00:00Z') })
    expect(nieuweBoetes('noot', [ingetrokken, vanAap], nu)).toEqual([])
  })
})

describe('het totaal van één speler', () => {
  it('telt alleen zijn boetes van dat seizoen die meetellen, betaald of niet', () => {
    const boetes = [
      boete('aap', 500),
      boete('aap', 200, { betaaldOp: new Date('2026-11-10T10:00:00Z') }),
      boete('aap', 300, { ingetrokkenOp: new Date('2026-11-09T10:00:00Z') }),
      boete('aap', 900, { datum: '2026-06-30' }),
      boete('noot', 1000),
    ]
    expect(totaalVan('aap', boetes, 2026)).toBe(700)
    expect(totaalVan('wim', boetes, 2026)).toBe(0)
  })
})

describe('vaste boetes op populariteit', () => {
  const soorten = [
    { id: 'a', omschrijving: 'Rode kaart', bedragCent: 1500 },
    { id: 'b', omschrijving: 'Tegengoal', bedragCent: 50 },
    { id: 'c', omschrijving: 'Eindpartij niet meegedaan', bedragCent: 100 },
    { id: 'd', omschrijving: 'Gele kaart', bedragCent: 500 },
  ]

  it('zet de vaakst gegeven boete van dit seizoen bovenaan, ook als hij anders geschreven is', () => {
    const boetes = [
      boete('aap', 100, { omschrijving: 'Eindpartij niet meegedaan' }),
      boete('noot', 100, { omschrijving: 'eindpartij niet meegedaan ' }),
      boete('mies', 500, { omschrijving: 'Gele kaart' }),
      boete('wim', 1500, { omschrijving: 'Rode kaart', ingetrokkenOp: new Date('2026-11-09T10:00:00Z') }),
      boete('wim', 1500, { omschrijving: 'Rode kaart', datum: '2026-06-30' }),
    ]
    expect(opPopulariteit(soorten, boetes, 2026).map((s) => s.id)).toEqual(['c', 'd', 'b', 'a'])
  })
})
