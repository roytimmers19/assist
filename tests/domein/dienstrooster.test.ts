import { describe, expect, it } from 'vitest'
import type { RoosterEvent, Weekduo } from '@/lib/domein/dienstrooster'
import { bouwNamenkaart, duoVanWeek, isoWeekVan, koppelRooster } from '@/lib/domein/dienstrooster'

/**
 * Drie duo's zijn genoeg om te bewijzen dát de rij rondgaat. De echte twaalf
 * staan in scripts/seizoen.json en worden dáár tegen de foto nagelopen; hier
 * gaat het alleen om de formule.
 */
const DRIE: Weekduo[] = [
  ['aap', 'noot'],
  ['mies', 'wim'],
  ['zus', 'jet'],
]

const KAART = new Map([
  ['aap', 's-aap'],
  ['noot', 's-noot'],
  ['mies', 's-mies'],
  ['wim', 's-wim'],
  ['zus', 's-zus'],
  ['jet', 's-jet'],
])

/**
 * Ruim genoeg om alle datums in dit bestand te bevatten. De echte grenzen van
 * het seizoen staan in scripts/seizoen.json en worden dáár getest; hier gaat
 * het alleen om de formule van het venster zelf.
 */
const SEIZOEN = { van: '2000-01-01', tot: '2100-01-01' }

function training(id: string, startOp: string, afgelast = false): RoosterEvent {
  return { id, type: 'training', thuis: null, startOp: new Date(startOp), afgelast }
}

function wedstrijd(id: string, startOp: string, thuis: boolean, afgelast = false): RoosterEvent {
  return { id, type: 'wedstrijd', thuis, startOp: new Date(startOp), afgelast }
}

describe('isoWeekVan', () => {
  it('zet de donderdagtraining en de zondagwedstrijd erna in dezelfde week', () => {
    expect(isoWeekVan(new Date('2026-09-10T14:30:00Z')).week).toBe(37)
    expect(isoWeekVan(new Date('2026-09-13T06:00:00Z')).week).toBe(37)
  })

  // Zondag 23:30 UTC is in Amsterdam al maandag, en dus een week verder. Wie
  // met UTC-dagen rekent zet dit event een week te vroeg.
  it('rekent in Amsterdamse wandkloktijd en niet in UTC', () => {
    expect(isoWeekVan(new Date('2026-11-15T23:30:00Z')).week).toBe(47)
  })

  // De zomertijd gaat in de nacht van 28 op 29 maart 2027 in: 22:30 UTC is
  // dan al 00:30 op maandag.
  it('houdt de zomertijdovergang bij', () => {
    expect(isoWeekVan(new Date('2027-03-28T22:30:00Z')).week).toBe(13)
  })

  it('kent week 53, want 2026 heeft er drieënvijftig', () => {
    expect(isoWeekVan(new Date('2026-12-31T16:30:00Z'))).toEqual({ jaar: 2026, week: 53 })
  })
})

describe('duoVanWeek', () => {
  it('gaat rond door de rij', () => {
    expect(duoVanWeek(1, DRIE)).toEqual(['aap', 'noot'])
    expect(duoVanWeek(3, DRIE)).toEqual(['zus', 'jet'])
    expect(duoVanWeek(4, DRIE)).toEqual(['aap', 'noot'])
    expect(duoVanWeek(52, DRIE)).toEqual(['aap', 'noot'])
  })

  // Week 53 staat niet op het papier. De app verzint geen duo dat niemand
  // heeft afgesproken.
  it('kent week 53 niet', () => {
    expect(duoVanWeek(53, DRIE)).toBeNull()
  })

  it('kent geen duo als er geen rij is', () => {
    expect(duoVanWeek(1, [])).toBeNull()
  })
})

describe('koppelRooster', () => {
  it('geeft elk event in de week hetzelfde duo', () => {
    const uit = koppelRooster({
      events: [training('t', '2026-09-10T14:30:00Z'), wedstrijd('w', '2026-09-13T06:00:00Z', true)],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    // Week 37, en (37 - 1) % 3 = 0: aap & noot, op allebei de events.
    expect(uit.toewijzingen).toEqual([
      { eventId: 't', spelerId: 's-aap', soort: 'materiaal' },
      { eventId: 't', spelerId: 's-noot', soort: 'materiaal' },
      { eventId: 'w', spelerId: 's-aap', soort: 'materiaal' },
      { eventId: 'w', spelerId: 's-noot', soort: 'materiaal' },
    ])
    expect(uit.fouten).toEqual([])
  })

  it('slaat een week over die niet op het rooster staat', () => {
    const uit = koppelRooster({
      events: [training('t', '2026-12-31T16:30:00Z')],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.overgeslagen).toEqual([
      { reden: 'week-staat-niet-op-het-rooster', week: 53, eventId: 't' },
    ])
    expect(uit.fouten).toEqual([])
  })

  it('slaat een naam over die nog geen lid is en laat zijn maat staan', () => {
    const zonderNoot = new Map(KAART)
    zonderNoot.delete('noot')

    const uit = koppelRooster({
      events: [training('t', '2026-09-10T14:30:00Z')],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: zonderNoot,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([{ eventId: 't', spelerId: 's-aap', soort: 'materiaal' }])
    expect(uit.overgeslagen).toEqual([
      { reden: 'onbekende-naam', roepnaam: 'noot', eventId: 't', soort: 'materiaal' },
    ])
    expect(uit.fouten).toEqual([])
  })

  it('zet de rijders op de uitwedstrijd van die dag', () => {
    const uit = koppelRooster({
      events: [
        training('t', '2026-09-17T14:30:00Z'),
        wedstrijd('w', '2026-09-20T06:00:00Z', false),
      ],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies', 'wim'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([
      { eventId: 'w', spelerId: 's-mies', soort: 'rijden' },
      { eventId: 'w', spelerId: 's-wim', soort: 'rijden' },
    ])
    expect(uit.fouten).toEqual([])
  })

  it('meldt een rijdatum waar geen wedstrijd op staat, met een uitweg', () => {
    const uit = koppelRooster({
      events: [],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.fouten).toHaveLength(1)
    expect(uit.fouten[0]).toContain('2026-09-20')
    // Een beschrijvende melding laat de leider niet weten wat te doen; deze
    // moet naar het afschrift wijzen waar hij de datum kan bijtrekken.
    expect(uit.fouten[0]).toContain('scripts/seizoen.json')
  })

  it('meldt een rijdatum met twee wedstrijden', () => {
    const uit = koppelRooster({
      events: [
        wedstrijd('een', '2026-09-20T06:00:00Z', false),
        wedstrijd('twee', '2026-09-20T12:00:00Z', false),
      ],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.fouten).toHaveLength(1)
    expect(uit.fouten[0]).toContain('scripts/seizoen.json')
  })

  // Bij een thuiswedstrijd rijdt niemand ergens heen. Staat hij tóch op het
  // rijschema, dan wijkt de agenda af van het papier en moet een mens kijken.
  it('meldt een rijdatum die een thuiswedstrijd blijkt, met een uitweg', () => {
    const uit = koppelRooster({
      events: [wedstrijd('w', '2026-09-20T06:00:00Z', true)],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.fouten).toHaveLength(1)
    expect(uit.fouten[0]).toContain('scripts/seizoen.json')
  })

  // Op 6 september stond een vraagteken op het papier. Dat is geen fout.
  it('laat een rijdatum zonder rijders met rust', () => {
    const uit = koppelRooster({
      events: [wedstrijd('w', '2026-09-06T05:30:00Z', false)],
      duos: [],
      rijdatums: [{ datum: '2026-09-06', rijders: [] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.fouten).toEqual([])
  })
})

describe('koppelRooster - het seizoensvenster', () => {
  // Zonder venster stapelt de eventtabel seizoenen op: een event van een
  // ander seizoen zou stilzwijgend hetzelfde duo krijgen als het papier van
  // dit seizoen, puur omdat het toevallig in dezelfde ISO-week valt.
  it('slaat een event vóór het seizoen over, en verwerkt de rest gewoon', () => {
    const uit = koppelRooster({
      events: [training('oud', '2025-09-10T14:30:00Z'), training('nieuw', '2026-09-10T14:30:00Z')],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: KAART,
      seizoen: { van: '2026-01-01', tot: '2026-12-31' },
    })

    expect(uit.overgeslagen).toContainEqual({ reden: 'buiten-het-seizoen', eventId: 'oud' })
    expect(uit.toewijzingen.some((t) => t.eventId === 'oud')).toBe(false)
    expect(uit.toewijzingen.some((t) => t.eventId === 'nieuw')).toBe(true)
  })

  it('slaat een event ná het seizoen over', () => {
    const uit = koppelRooster({
      events: [training('laat', '2027-09-10T14:30:00Z')],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: KAART,
      seizoen: { van: '2026-01-01', tot: '2026-12-31' },
    })

    expect(uit.overgeslagen).toEqual([{ reden: 'buiten-het-seizoen', eventId: 'laat' }])
    expect(uit.toewijzingen).toEqual([])
  })

  it('rekent de grensdag zelf nog mee in het seizoen', () => {
    const uit = koppelRooster({
      events: [training('op-de-grens', '2026-01-01T10:00:00Z')],
      duos: DRIE,
      rijdatums: [],
      spelerIdVan: KAART,
      seizoen: { van: '2026-01-01', tot: '2026-12-31' },
    })

    expect(uit.overgeslagen.some((o) => o.reden === 'buiten-het-seizoen')).toBe(false)
  })
})

describe('koppelRooster - een afgelaste wedstrijd op de rijdatum', () => {
  // De spec is expliciet: een afgelaste uitwedstrijd houdt zijn rijders. Het
  // rijschema hangt aan het papier, niet aan of de wedstrijd doorging.
  it('geeft een enkele afgelaste uitwedstrijd gewoon zijn rijders', () => {
    const uit = koppelRooster({
      events: [wedstrijd('w', '2026-09-20T06:00:00Z', false, true)],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies', 'wim'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([
      { eventId: 'w', spelerId: 's-mies', soort: 'rijden' },
      { eventId: 'w', spelerId: 's-wim', soort: 'rijden' },
    ])
    expect(uit.fouten).toEqual([])
  })

  // Staat er een inhaalduel naast de afgelasting, dan is dát de wedstrijd van
  // die dag — niet de afgelaste.
  it('gebruikt het inhaalduel als er naast de afgelasting een tweede wedstrijd staat', () => {
    const uit = koppelRooster({
      events: [
        wedstrijd('afgelast', '2026-09-20T06:00:00Z', false, true),
        wedstrijd('inhaal', '2026-09-20T12:00:00Z', false, false),
      ],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies', 'wim'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([
      { eventId: 'inhaal', spelerId: 's-mies', soort: 'rijden' },
      { eventId: 'inhaal', spelerId: 's-wim', soort: 'rijden' },
    ])
    expect(uit.fouten).toEqual([])
  })

  // Staan er twee afgelastingen op dezelfde dag, dan blijft er na het laten
  // vallen niets over — en dat is weer een fout, geen stille lege plek.
  it('meldt een fout als er na het laten vallen van afgelastingen niets overblijft', () => {
    const uit = koppelRooster({
      events: [
        wedstrijd('een', '2026-09-20T06:00:00Z', false, true),
        wedstrijd('twee', '2026-09-20T12:00:00Z', false, true),
      ],
      duos: [],
      rijdatums: [{ datum: '2026-09-20', rijders: ['mies'] }],
      spelerIdVan: KAART,
      seizoen: SEIZOEN,
    })

    expect(uit.toewijzingen).toEqual([])
    expect(uit.fouten).toHaveLength(1)
  })
})

describe('bouwNamenkaart', () => {
  it('koppelt een roepnaam met precies één rij aan zijn spelers-id', () => {
    const kaart = bouwNamenkaart(
      { Teun: 'Teun Bakker' },
      [{ id: 's1', naam: 'Teun Bakker' }],
    )

    expect(kaart.spelerIdVan.get('Teun')).toBe('s1')
    expect(kaart.fouten).toEqual([])
  })

  // Dit gebeurt echt in productie: een speler staat met een spatie achteraan
  // in de database, terwijl het afschrift die spatie niet overneemt.
  it('vergelijkt namen getrimd', () => {
    const kaart = bouwNamenkaart(
      { Bram: 'Bram' },
      [{ id: 's1', naam: 'Bram ' }],
    )

    expect(kaart.spelerIdVan.get('Bram')).toBe('s1')
    expect(kaart.fouten).toEqual([])
  })

  it('zet een roepnaam die met zoveel woorden nog geen lid is bij nogGeenLid, en niet bij fouten', () => {
    const kaart = bouwNamenkaart({ Finn: null }, [])

    expect(kaart.nogGeenLid).toEqual(['Finn'])
    expect(kaart.fouten).toEqual([])
    expect(kaart.spelerIdVan.has('Finn')).toBe(false)
  })

  it('meldt een fout als de databasenaam nergens voorkomt, zoals wanneer iemand is hernoemd', () => {
    const kaart = bouwNamenkaart(
      { Teun: 'Teun Bakker' },
      [{ id: 's1', naam: 'Teun B.' }],
    )

    expect(kaart.fouten).toHaveLength(1)
    expect(kaart.fouten[0]).toContain('Teun')
    expect(kaart.spelerIdVan.has('Teun')).toBe(false)
  })

  it('meldt een fout als twee spelers dezelfde naam hebben', () => {
    const kaart = bouwNamenkaart(
      { Teun: 'Teun Bakker' },
      [
        { id: 's1', naam: 'Teun Bakker' },
        { id: 's2', naam: 'Teun Bakker' },
      ],
    )

    expect(kaart.fouten).toHaveLength(1)
    expect(kaart.spelerIdVan.has('Teun')).toBe(false)
  })

  it('laat één foute roepnaam de rest van de kaart niet tegenhouden', () => {
    const kaart = bouwNamenkaart(
      { Teun: 'Teun Bakker', Sten: 'Sten Meijer' },
      [{ id: 's1', naam: 'Sten Meijer' }],
    )

    expect(kaart.fouten).toHaveLength(1)
    expect(kaart.spelerIdVan.get('Sten')).toBe('s1')
    expect(kaart.spelerIdVan.has('Teun')).toBe(false)
  })
})
