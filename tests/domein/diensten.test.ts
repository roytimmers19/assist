import { describe, expect, it } from 'vitest'
import type { DienstEvent, Toewijzing } from '@/lib/domein/diensten'
import { aantalNodig, magRijdienst, verdeelDiensten } from '@/lib/domein/diensten'

function uitwedstrijd(id: string): DienstEvent {
  return { id, type: 'wedstrijd', thuis: false, afgelast: false }
}
function thuiswedstrijd(id: string): DienstEvent {
  return { id, type: 'wedstrijd', thuis: true, afgelast: false }
}
function training(id: string): DienstEvent {
  return { id, type: 'training', thuis: null, afgelast: false }
}

const ZES = ['s1', 's2', 's3', 's4', 's5', 's6']

function van(uit: Toewijzing[], eventId: string, soort: string): string[] {
  return uit.filter((t) => t.eventId === eventId && t.soort === soort).map((t) => t.spelerId)
}

describe('magRijdienst', () => {
  it('geldt alleen voor een uitwedstrijd', () => {
    expect(magRijdienst(uitwedstrijd('e'))).toBe(true)
    expect(magRijdienst(thuiswedstrijd('e'))).toBe(false)
    expect(magRijdienst(training('e'))).toBe(false)
  })

  // Niet raden: een wedstrijd waarvan thuis/uit onbekend is krijgt niets.
  it('geldt niet als thuis of uit onbekend is', () => {
    expect(magRijdienst({ id: 'e', type: 'wedstrijd', thuis: null, afgelast: false })).toBe(false)
  })

  // Het rooster blijft aanpasbaar, dus een afgelaste uitwedstrijd houdt zijn
  // rijdienst. Alleen het verdelen slaat hem over.
  it('geldt ook voor een afgelaste uitwedstrijd', () => {
    expect(magRijdienst({ ...uitwedstrijd('e'), afgelast: true })).toBe(true)
  })
})

describe('aantalNodig', () => {
  it('vraagt twee man materiaaldienst bij elk event, ook een training', () => {
    expect(aantalNodig(training('e'), 'materiaal')).toBe(2)
    expect(aantalNodig(thuiswedstrijd('e'), 'materiaal')).toBe(2)
  })

  it('vraagt vier rijders bij een uitwedstrijd en nul bij de rest', () => {
    expect(aantalNodig(uitwedstrijd('e'), 'rijden')).toBe(4)
    expect(aantalNodig(thuiswedstrijd('e'), 'rijden')).toBe(0)
  })

  it('telt gewoon door bij een afgelast event', () => {
    expect(aantalNodig({ ...training('e'), afgelast: true }, 'materiaal')).toBe(2)
  })
})

describe('verdeelDiensten', () => {
  it('verdeelt materiaaldienst gelijkmatig over de selectie', () => {
    const uit = verdeelDiensten({
      spelerIds: ZES,
      events: [training('e1'), training('e2'), training('e3')],
      bestaand: [],
    })

    expect(uit).toHaveLength(6)
    expect(uit.map((t) => t.spelerId).sort()).toEqual(ZES)
  })

  // Eén gedeelde wijzer zou de twee soorten door elkaar schuiven. Na een
  // thuiswedstrijd met alleen materiaaldienst moet rijden nog bij s1 beginnen.
  it('geeft materiaal en rijden elk hun eigen beurt', () => {
    const uit = verdeelDiensten({
      spelerIds: ZES,
      events: [thuiswedstrijd('e1'), uitwedstrijd('e2')],
      bestaand: [],
    })

    expect(van(uit, 'e1', 'materiaal')).toEqual(['s1', 's2'])
    expect(van(uit, 'e2', 'materiaal')).toEqual(['s3', 's4'])
    expect(van(uit, 'e2', 'rijden')).toEqual(['s1', 's2', 's3', 's4'])
  })

  it('geeft een thuiswedstrijd en een training geen rijdienst', () => {
    const uit = verdeelDiensten({
      spelerIds: ZES,
      events: [thuiswedstrijd('e1'), training('e2')],
      bestaand: [],
    })

    expect(uit.filter((t) => t.soort === 'rijden')).toEqual([])
  })

  // Het enige waar 'afgelast' iets uitmaakt: het verdelen laat hem met rust.
  it('slaat een afgelast event helemaal over bij het verdelen', () => {
    const uit = verdeelDiensten({
      spelerIds: ZES,
      events: [{ ...uitwedstrijd('e1'), afgelast: true }],
      bestaand: [],
    })

    expect(uit).toEqual([])
  })

  it('vult aan tot het streefgetal en laat staan wat er al stond', () => {
    const uit = verdeelDiensten({
      spelerIds: ZES,
      events: [training('e1')],
      bestaand: [{ eventId: 'e1', spelerId: 's5', soort: 'materiaal' }],
    })

    expect(uit).toHaveLength(1)
    expect(uit[0].spelerId).not.toBe('s5')
  })

  it('zet niemand twee keer op dezelfde dienst bij hetzelfde event', () => {
    const uit = verdeelDiensten({
      spelerIds: ['s1', 's2'],
      events: [training('e1')],
      bestaand: [{ eventId: 'e1', spelerId: 's1', soort: 'materiaal' }],
    })

    expect(van(uit, 'e1', 'materiaal')).toEqual(['s2'])
  })

  it('vult gedeeltelijk als er minder spelers dan plekken zijn', () => {
    const uit = verdeelDiensten({
      spelerIds: ['s1', 's2'],
      events: [uitwedstrijd('e1')],
      bestaand: [],
    })

    expect(van(uit, 'e1', 'rijden')).toEqual(['s1', 's2'])
  })

  it('levert niets op zonder spelers', () => {
    expect(verdeelDiensten({ spelerIds: [], events: [training('e1')], bestaand: [] })).toEqual([])
  })

  it('levert niets op als alles al gevuld is', () => {
    const bestaand: Toewijzing[] = [
      { eventId: 'e1', spelerId: 's1', soort: 'materiaal' },
      { eventId: 'e1', spelerId: 's2', soort: 'materiaal' },
    ]
    expect(verdeelDiensten({ spelerIds: ZES, events: [training('e1')], bestaand })).toEqual([])
  })
})
