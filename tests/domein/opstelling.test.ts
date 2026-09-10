import { describe, expect, it } from 'vitest'
import {
  bepaalAanwezigen,
  bepaalBank,
  bepaalWaarschuwingen,
  kandidatenVoor,
  maakOpstellingWeergave,
} from '@/lib/domein/opstelling'
import type { Stand } from '@/lib/domein/types'

function komt(spelerId: string): Stand {
  return { spelerId, status: 'ja', bron: 'aanname', toelichting: null, gezetOp: null }
}

function afgemeld(spelerId: string): Stand {
  return { spelerId, status: 'nee', bron: 'speler', toelichting: null, gezetOp: new Date() }
}

/** Zegt 'ja' voor dit ene event, tegen zijn standaard in. */
function meldtZichAan(spelerId: string): Stand {
  return { spelerId, status: 'ja', bron: 'speler', toelichting: null, gezetOp: new Date() }
}

/** Doet dit soort event structureel niet, en zei er zelf niets over. */
function doetNietMee(spelerId: string): Stand {
  return { spelerId, status: 'nee', bron: 'aanname', toelichting: null, gezetOp: null }
}

function opVeld(slot: number, spelerId: string) {
  return { slot, spelerId, gastnaam: null, gastnummer: null }
}

describe('bepaalBank', () => {
  it('zet wie komt en niet opgesteld is op de bank', () => {
    const bank = bepaalBank([komt('a'), komt('b'), komt('c')], [opVeld(0, 'a')])
    expect(bank).toEqual([
      { spelerId: 'b', gastnaam: null, gastnummer: null },
      { spelerId: 'c', gastnaam: null, gastnummer: null },
    ])
  })

  it('laat wie zich heeft afgemeld van de bank weg', () => {
    const bank = bepaalBank([komt('a'), afgemeld('b')], [opVeld(0, 'a')])
    expect(bank).toEqual([])
  })

  it('zet gasten zonder veldplek op de bank', () => {
    const bank = bepaalBank(
      [komt('a')],
      [opVeld(0, 'a'), { slot: null, spelerId: null, gastnaam: 'Sander', gastnummer: 12 }],
    )
    expect(bank).toEqual([{ spelerId: null, gastnaam: 'Sander', gastnummer: 12 }])
  })

  it('rekent een afgemelde speler die tóch is opgesteld niet tot de bank', () => {
    const bank = bepaalBank([komt('a'), afgemeld('b')], [opVeld(0, 'a'), opVeld(1, 'b')])
    expect(bank).toEqual([])
  })
})

describe('bepaalWaarschuwingen', () => {
  it('meldt niets als iedereen op het veld ook komt', () => {
    expect(bepaalWaarschuwingen([komt('a'), komt('b')], [opVeld(0, 'a')])).toEqual([])
  })

  it('meldt een opgestelde speler die zich heeft afgemeld', () => {
    expect(bepaalWaarschuwingen([komt('a'), afgemeld('b')], [opVeld(0, 'a'), opVeld(1, 'b')])).toEqual(['b'])
  })

  it('meldt een opgestelde speler die niet meer in de selectie zit', () => {
    // Op non-actief gezet: hij komt niet meer in de stand voor, maar staat nog
    // wel opgesteld. Zelfde mechanisme, tweede probleem gratis opgelost.
    expect(bepaalWaarschuwingen([komt('a')], [opVeld(0, 'a'), opVeld(1, 'weg')])).toEqual(['weg'])
  })

  it('waarschuwt nooit over een gast', () => {
    const plekken = [{ slot: 0, spelerId: null, gastnaam: 'Sander', gastnummer: null }]
    expect(bepaalWaarschuwingen([], plekken)).toEqual([])
  })
})

describe('maakOpstellingWeergave', () => {
  const naamVan = new Map([
    ['a', 'Milan Hendriks'],
    ['b', 'Daan Smit'],
    ['c', 'Ruben Jansen'],
  ])
  const nummerVan = new Map<string, number | null>([
    ['a', 1],
    ['b', 7],
    ['c', null],
  ])

  it('zet de basis op slotvolgorde met naam en rugnummer erbij', () => {
    const weergave = maakOpstellingWeergave({
      stand: [komt('a'), komt('b')],
      plekken: [opVeld(5, 'b'), opVeld(0, 'a')],
      naamVan,
      nummerVan,
    })

    expect(weergave.basis).toEqual([
      { slot: 0, spelerId: 'a', nummer: 1, naam: 'Milan Hendriks', gast: false, gewaarschuwd: false },
      { slot: 5, spelerId: 'b', nummer: 7, naam: 'Daan Smit', gast: false, gewaarschuwd: false },
    ])
  })

  it('leest een gast uit de plek zelf en merkt hem als gast', () => {
    const weergave = maakOpstellingWeergave({
      stand: [],
      plekken: [{ slot: 3, spelerId: null, gastnaam: 'Wout van Uden', gastnummer: 14 }],
      naamVan,
      nummerVan,
    })

    expect(weergave.basis).toEqual([
      { slot: 3, spelerId: null, nummer: 14, naam: 'Wout van Uden', gast: true, gewaarschuwd: false },
    ])
  })

  it('houdt een speler zonder rugnummer op null in plaats van te verzinnen', () => {
    const weergave = maakOpstellingWeergave({
      stand: [komt('c')],
      plekken: [opVeld(9, 'c')],
      naamVan,
      nummerVan,
    })

    expect(weergave.basis[0].nummer).toBeNull()
  })

  it('markeert wie opgesteld staat maar zich heeft afgemeld', () => {
    const weergave = maakOpstellingWeergave({
      stand: [komt('a'), afgemeld('b')],
      plekken: [opVeld(0, 'a'), opVeld(1, 'b')],
      naamVan,
      nummerVan,
    })

    expect(weergave.basis.map((r) => r.gewaarschuwd)).toEqual([false, true])
  })

  it('zet wie komt en niet opgesteld is op de bank, nooit gewaarschuwd', () => {
    const weergave = maakOpstellingWeergave({
      stand: [komt('a'), komt('b')],
      plekken: [opVeld(0, 'a'), { slot: null, spelerId: null, gastnaam: 'Senn', gastnummer: null }],
      naamVan,
      nummerVan,
    })

    expect(weergave.bank).toEqual([
      { slot: null, spelerId: 'b', nummer: 7, naam: 'Daan Smit', gast: false, gewaarschuwd: false },
      { slot: null, spelerId: null, nummer: null, naam: 'Senn', gast: true, gewaarschuwd: false },
    ])
  })

  it('noemt een speler die uit de lijst is verdwenen onbekend in plaats van hem weg te laten', () => {
    const weergave = maakOpstellingWeergave({
      stand: [],
      plekken: [opVeld(0, 'weg')],
      naamVan,
      nummerVan,
    })

    expect(weergave.basis[0]).toMatchObject({ naam: 'onbekend', nummer: null, gast: false })
  })
})

describe('kandidatenVoor', () => {
  const doetWel = (id: string) => ({ id, doetMee: true })
  const doetNiet = (id: string) => ({ id, doetMee: false })

  it('laat wie dit soort event structureel niet doet uit de lijst', () => {
    const uit = kandidatenVoor([doetWel('a'), doetNiet('b')], [komt('a'), doetNietMee('b')], [])
    expect(uit).toEqual(['a'])
  })

  // De kernregel, één laag hoger: een melding wint van een standaard.
  it('houdt wie zich voor dit ene event heeft aangemeld in de lijst', () => {
    const uit = kandidatenVoor([doetWel('a'), doetNiet('b')], [komt('a'), meldtZichAan('b')], [])
    expect(uit).toEqual(['a', 'b'])
  })

  // Anders verdwijnt de naam onder zijn eigen vakje op het veld.
  it('houdt wie al opgesteld staat in de lijst', () => {
    const uit = kandidatenVoor(
      [doetWel('a'), doetNiet('b')],
      [komt('a'), doetNietMee('b')],
      [opVeld(1, 'b')],
    )
    expect(uit).toEqual(['a', 'b'])
  })

  // Afmelden is een melding, geen slot: hij blijft te kiezen voor wie tóch belt.
  it('houdt wie zich heeft afgemeld in de lijst', () => {
    expect(kandidatenVoor([doetWel('a')], [afgemeld('a')], [])).toEqual(['a'])
  })
})

describe('bepaalAanwezigen', () => {
  it('geeft alleen wie op ja staat', () => {
    expect(bepaalAanwezigen([komt('a'), afgemeld('b')])).toEqual(new Set(['a']))
  })

  // Een eigen aanmelding en een aanname zijn allebei een ja; de bron doet er
  // voor deze vraag niet toe.
  it('telt een eigen aanmelding net zo hard mee als een aanname', () => {
    expect(bepaalAanwezigen([komt('a'), meldtZichAan('b')])).toEqual(new Set(['a', 'b']))
  })

  it('geeft een lege verzameling als niemand er is', () => {
    expect(bepaalAanwezigen([afgemeld('a'), doetNietMee('b')])).toEqual(new Set())
  })
})
