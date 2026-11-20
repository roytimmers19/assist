import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  bevestigVoorstel,
  bewaarBoetesoort,
  geefBoetes,
  koppelTeLaat,
  laatVoorstelVallen,
  leesBoetes,
  leesBoetesoorten,
  leesVoorstelInvoer,
  maakBetaaldOngedaan,
  trekBoeteIn,
  zetBetaald,
  zetOverstapIn,
  zetSoortActief,
} from '@/lib/db/boetepot'
import { aanwezigheid, boetesoorten, events, spelers } from '@/lib/db/schema'
import { nieuweBoetes, openstaandCent, potCent, ranglijst } from '@/lib/domein/boetepot'
import { voorstellen } from '@/lib/domein/voorstellen'
import { maakSchoon, testDb } from './opzet'

async function nieuweSpeler(naam: string): Promise<string> {
  const [rij] = await testDb
    .insert(spelers)
    .values({ naam, email: `${naam}@voorbeeld.nl`, accountStatus: 'actief' })
    .returning()
  return rij.id
}

async function nieuweWedstrijd(): Promise<string> {
  // Zondag 22 november 2026, 14:00; afmelden kan tot en met dinsdag.
  const [rij] = await testDb
    .insert(events)
    .values({
      type: 'wedstrijd',
      startOp: new Date('2026-11-22T13:00:00Z'),
      afmeldDeadline: new Date('2026-11-17T22:59:59Z'),
      tegenstander: 'Tegenstander 3',
    })
    .returning()
  return rij.id
}

describe('boetes geven en intrekken', () => {
  beforeEach(maakSchoon)

  it('geeft twee spelers tegelijk een boete uit de lijst', async () => {
    const [mies, aap, noot] = [
      await nieuweSpeler('mies'),
      await nieuweSpeler('aap'),
      await nieuweSpeler('noot'),
    ]
    const soort = await bewaarBoetesoort(testDb, {
      omschrijving: 'Te laat op training',
      bedragCent: 200,
    })

    await geefBoetes(testDb, {
      spelerIds: [aap, noot],
      omschrijving: 'Te laat op training',
      bedragCent: 200,
      datum: '2026-11-19',
      eventId: null,
      soortId: soort,
      door: mies,
    })

    const boetes = await leesBoetes(testDb)
    expect(boetes.map((b) => [b.spelerId, b.omschrijving, b.bedragCent]).sort()).toEqual(
      [
        [aap, 'Te laat op training', 200],
        [noot, 'Te laat op training', 200],
      ].sort(),
    )
    expect(boetes[0].gegevenOp).toEqual(boetes[1].gegevenOp)
  })

  it('bewaart een boete per stuk met zijn aantal', async () => {
    const [mies, aap] = [await nieuweSpeler('mies'), await nieuweSpeler('aap')]
    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Tegengoal',
      bedragCent: 1000,
      aantal: 20,
      datum: '2026-11-08',
      eventId: null,
      soortId: null,
      door: mies,
    })

    const [boete] = await leesBoetes(testDb)
    expect(boete).toMatchObject({ omschrijving: 'Tegengoal', bedragCent: 1000, aantal: 20 })
  })

  it('geeft een eigen boete zonder soort', async () => {
    const [mies, wim] = [await nieuweSpeler('mies'), await nieuweSpeler('wim')]
    await geefBoetes(testDb, {
      spelerIds: [wim],
      omschrijving: 'Bal over het hek',
      bedragCent: 150,
      datum: '2026-11-05',
      eventId: null,
      soortId: null,
      door: mies,
    })

    const [boete] = await leesBoetes(testDb)
    expect(boete).toMatchObject({ spelerId: wim, omschrijving: 'Bal over het hek', bedragCent: 150 })
  })

  it('laat oude boetes met rust als een vaste boete duurder wordt', async () => {
    const [mies, aap] = [await nieuweSpeler('mies'), await nieuweSpeler('aap')]
    const soort = await bewaarBoetesoort(testDb, {
      omschrijving: 'Te laat op training',
      bedragCent: 200,
    })
    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Te laat op training',
      bedragCent: 200,
      datum: '2026-11-19',
      eventId: null,
      soortId: soort,
      door: mies,
    })

    await bewaarBoetesoort(testDb, { id: soort, omschrijving: 'Te laat op training', bedragCent: 300 })

    const [boete] = await leesBoetes(testDb)
    expect(boete.bedragCent).toBe(200)
    const [vast] = await leesBoetesoorten(testDb)
    expect(vast.bedragCent).toBe(300)
  })

  it('onthoudt of een vaste boete per stuk is', async () => {
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Tegengoal', bedragCent: 50, perStuk: true })
    expect((await leesBoetesoorten(testDb))[0].perStuk).toBe(true)

    await bewaarBoetesoort(testDb, { id: soort, omschrijving: 'Tegengoal', bedragCent: 50, perStuk: false })
    expect((await leesBoetesoorten(testDb))[0].perStuk).toBe(false)
  })

  it('trekt een boete in zonder hem te wissen', async () => {
    const [mies, aap] = [await nieuweSpeler('mies'), await nieuweSpeler('aap')]
    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Gele kaart',
      bedragCent: 1000,
      datum: '2026-11-08',
      eventId: null,
      soortId: null,
      door: mies,
    })
    const [boete] = await leesBoetes(testDb)

    await trekBoeteIn(testDb, boete.id, mies)

    const boetes = await leesBoetes(testDb)
    expect(boetes).toHaveLength(1)
    expect(boetes[0].ingetrokkenOp).not.toBeNull()
    expect(openstaandCent(aap, boetes)).toBe(0)
    expect(potCent(boetes, 2026)).toBe(0)
    expect(ranglijst(boetes, [{ id: aap, naam: 'aap' }], 2026).plekken).toEqual([])
  })
})

describe('afrekenen', () => {
  beforeEach(maakSchoon)

  async function metTweeBoetes() {
    const [noot, aap] = [await nieuweSpeler('noot'), await nieuweSpeler('aap')]
    for (const bedragCent of [700, 500]) {
      await geefBoetes(testDb, {
        spelerIds: [aap],
        omschrijving: 'Gele kaart',
        bedragCent,
        datum: '2026-11-08',
        eventId: null,
        soortId: null,
        door: noot,
      })
    }
    return { noot, aap }
  }

  it('zet alle openstaande boetes van een speler op betaald, en de ranglijst en de pot blijven gelijk', async () => {
    const { noot, aap } = await metTweeBoetes()

    await zetBetaald(testDb, aap, noot)

    const boetes = await leesBoetes(testDb)
    expect(openstaandCent(aap, boetes)).toBe(0)
    expect(potCent(boetes, 2026)).toBe(1200)
    expect(ranglijst(boetes, [{ id: aap, naam: 'aap' }], 2026).plekken[0].totaalCent).toBe(1200)
  })

  it('laat een boete die na het afvinken komt gewoon open staan', async () => {
    const { noot, aap } = await metTweeBoetes()
    await zetBetaald(testDb, aap, noot)

    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Te laat op training',
      bedragCent: 200,
      datum: '2026-11-19',
      eventId: null,
      soortId: null,
      door: noot,
    })

    expect(openstaandCent(aap, await leesBoetes(testDb))).toBe(200)
  })

  it('draait een keer afvinken terug, en alleen die keer', async () => {
    const { noot, aap } = await metTweeBoetes()
    await zetBetaald(testDb, aap, noot)
    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Te laat op training',
      bedragCent: 200,
      datum: '2026-11-19',
      eventId: null,
      soortId: null,
      door: noot,
    })
    const tweede = await zetBetaald(testDb, aap, noot)

    await maakBetaaldOngedaan(testDb, aap, tweede)

    expect(openstaandCent(aap, await leesBoetes(testDb))).toBe(200)
  })
})

describe('voorstellen bij te laat afmelden', () => {
  beforeEach(maakSchoon)

  async function laatAapTeLaatAfmelden() {
    const [mies, aap] = [await nieuweSpeler('mies'), await nieuweSpeler('aap')]
    const eventId = await nieuweWedstrijd()
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    await koppelTeLaat(testDb, 'wedstrijd', soort)
    // De koppeling ligt in het verleden van deze afmelding: zet hem vast.
    await testDb
      .update(boetesoorten)
      .set({ teLaatWedstrijdOp: new Date('2026-11-01T00:00:00Z') })
      .where(eq(boetesoorten.id, soort))
    await testDb.insert(aanwezigheid).values({
      eventId,
      spelerId: aap,
      status: 'nee',
      bron: 'speler',
      toelichting: 'werk',
      gezetOp: new Date('2026-11-18T10:00:00Z'),
      gezetDoorSpelerId: aap,
    })
    return { mies, aap, eventId }
  }

  it('leest alles wat nodig is om een voorstel te doen', async () => {
    const { aap, eventId } = await laatAapTeLaatAfmelden()

    const uit = voorstellen(await leesVoorstelInvoer(testDb))

    expect(uit).toMatchObject([
      { eventId, spelerId: aap, omschrijving: 'Te laat afgemeld', bedragCent: 500, reden: 'werk' },
    ])
  })

  it('maakt bij bevestigen een boete op de dag van de afmelding, en het voorstel komt niet terug', async () => {
    const { mies, aap } = await laatAapTeLaatAfmelden()
    const [voorstel] = voorstellen(await leesVoorstelInvoer(testDb))

    await bevestigVoorstel(testDb, voorstel, mies)
    await bevestigVoorstel(testDb, voorstel, mies)

    const boetes = await leesBoetes(testDb)
    expect(boetes).toHaveLength(1)
    expect(boetes[0]).toMatchObject({ spelerId: aap, datum: '2026-11-18', status: 'telt', bedragCent: 500 })
    expect(voorstellen(await leesVoorstelInvoer(testDb))).toEqual([])
  })

  it('doet opnieuw een voorstel als de bevestigde boete is ingetrokken, en laat opnieuw bevestigen toe', async () => {
    const { mies } = await laatAapTeLaatAfmelden()
    const [voorstel] = voorstellen(await leesVoorstelInvoer(testDb))
    await bevestigVoorstel(testDb, voorstel, mies)
    const [boete] = await leesBoetes(testDb)

    await trekBoeteIn(testDb, boete.id, mies)

    const [opnieuw] = voorstellen(await leesVoorstelInvoer(testDb))
    expect(opnieuw).toBeDefined()
    await bevestigVoorstel(testDb, opnieuw, mies)
    const boetes = await leesBoetes(testDb)
    expect(boetes).toHaveLength(2)
    expect(boetes.filter((b) => b.ingetrokkenOp === null)).toHaveLength(1)
  })

  it('laat een gevallen voorstel niet meer terugkomen en nergens meetellen', async () => {
    const { mies, aap } = await laatAapTeLaatAfmelden()
    const [voorstel] = voorstellen(await leesVoorstelInvoer(testDb))

    await laatVoorstelVallen(testDb, voorstel, mies)

    const boetes = await leesBoetes(testDb)
    expect(openstaandCent(aap, boetes)).toBe(0)
    expect(voorstellen(await leesVoorstelInvoer(testDb))).toEqual([])
  })

  it('laat één vaste boete gelden voor wedstrijden en trainingen tegelijk', async () => {
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })

    await koppelTeLaat(testDb, 'wedstrijd', soort)
    await koppelTeLaat(testDb, 'training', soort)

    const invoer = await leesVoorstelInvoer(testDb)
    expect(invoer.koppelingen.map((k) => k.type).sort()).toEqual(['training', 'wedstrijd'])
  })

  it('haalt de koppeling weg als een vaste boete van de lijst gaat, ook na terugzetten', async () => {
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    await koppelTeLaat(testDb, 'wedstrijd', soort)

    await zetSoortActief(testDb, soort, false)
    await zetSoortActief(testDb, soort, true)

    expect((await leesVoorstelInvoer(testDb)).koppelingen).toEqual([])
  })

  it('doet ook een voorstel bij een event van vóór het koppelen, als de afmelding erna kwam', async () => {
    const [mies, noot] = [await nieuweSpeler('mies'), await nieuweSpeler('noot')]
    const eventId = await nieuweWedstrijd()
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    await koppelTeLaat(testDb, 'wedstrijd', soort)
    // De wedstrijd was al voorbij toen de boete werd gekoppeld.
    await testDb
      .update(boetesoorten)
      .set({ teLaatWedstrijdOp: new Date('2026-11-23T09:00:00Z') })
      .where(eq(boetesoorten.id, soort))
    await testDb.insert(aanwezigheid).values({
      eventId,
      spelerId: noot,
      status: 'nee',
      bron: 'leider',
      gezetOp: new Date('2026-11-23T10:00:00Z'),
      gezetDoorSpelerId: mies,
    })

    expect(voorstellen(await leesVoorstelInvoer(testDb))).toMatchObject([{ eventId, spelerId: noot }])
  })

  it('koppelt per soort event hooguit één vaste boete', async () => {
    const eerste = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    const tweede = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat, duur', bedragCent: 800 })

    await koppelTeLaat(testDb, 'wedstrijd', eerste)
    await koppelTeLaat(testDb, 'wedstrijd', tweede)

    const soorten = await leesBoetesoorten(testDb)
    expect(soorten.find((s) => s.id === eerste)?.teLaatWedstrijdOp).toBeNull()
    expect(soorten.find((s) => s.id === tweede)?.teLaatWedstrijdOp).not.toBeNull()
  })

  it('verschuift het moment van koppelen niet als dezelfde keuze nog eens bewaard wordt', async () => {
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    await koppelTeLaat(testDb, 'wedstrijd', soort)
    const [voor] = await leesBoetesoorten(testDb)

    await koppelTeLaat(testDb, 'wedstrijd', soort)

    const [na] = await leesBoetesoorten(testDb)
    expect(na.teLaatWedstrijdOp).toEqual(voor.teLaatWedstrijdOp)
  })

  it('haalt de koppeling weg met geen voorstel', async () => {
    const soort = await bewaarBoetesoort(testDb, { omschrijving: 'Te laat afgemeld', bedragCent: 500 })
    await koppelTeLaat(testDb, 'training', soort)

    await koppelTeLaat(testDb, 'training', null)

    const [vast] = await leesBoetesoorten(testDb)
    expect(vast.teLaatTrainingOp).toBeNull()
  })
})

describe('de overstap uit de oude app', () => {
  beforeEach(maakSchoon)

  it('zet alles in één keer over, met betaald waar dat zo was', async () => {
    const [aap, noot] = [await nieuweSpeler('aap'), await nieuweSpeler('noot')]
    const moment = new Date('2026-11-20T09:00:00Z')

    await zetOverstapIn(
      testDb,
      [
        { spelerId: aap, omschrijving: 'Gele kaart', bedragCent: 500, datum: '2026-09-13', betaald: true },
        { spelerId: aap, omschrijving: 'Te laat', bedragCent: 200, datum: '2026-10-01', betaald: false },
        { spelerId: noot, omschrijving: 'Rode kaart', bedragCent: 1500, datum: '2026-10-04', betaald: false },
      ],
      moment,
    )

    const boetes = await leesBoetes(testDb)
    const lijst = ranglijst(boetes, [{ id: aap, naam: 'aap' }, { id: noot, naam: 'noot' }], 2026)
    expect(lijst.plekken.map((p) => [p.naam, p.totaalCent])).toEqual([
      ['noot', 1500],
      ['aap', 700],
    ])
    expect(openstaandCent(aap, boetes)).toBe(200)
    expect(openstaandCent(noot, boetes)).toBe(1500)
  })

  it('zet overgezette boetes niet als nieuw op het beginscherm', async () => {
    const aap = await nieuweSpeler('aap')
    const moment = new Date('2026-11-20T09:00:00Z')
    await zetOverstapIn(
      testDb,
      [{ spelerId: aap, omschrijving: 'Te laat', bedragCent: 200, datum: '2026-11-19', betaald: false }],
      moment,
    )

    expect(nieuweBoetes(aap, await leesBoetes(testDb), moment)).toHaveLength(1)
    expect(nieuweBoetes(aap, await leesBoetes(testDb), new Date('2026-11-27T12:00:00Z'))).toEqual([])
    const [boete] = await leesBoetes(testDb)
    expect(boete.gegevenOp.getTime()).toBeLessThan(moment.getTime())
  })

  it('weigert als er al boetes zijn, en schrijft dan niets', async () => {
    const aap = await nieuweSpeler('aap')
    await geefBoetes(testDb, {
      spelerIds: [aap],
      omschrijving: 'Gele kaart',
      bedragCent: 500,
      datum: '2026-11-08',
      eventId: null,
      soortId: null,
      door: aap,
    })

    await expect(
      zetOverstapIn(
        testDb,
        [{ spelerId: aap, omschrijving: 'Te laat', bedragCent: 200, datum: '2026-10-01', betaald: false }],
        new Date(),
      ),
    ).rejects.toThrow(/al boetes/)
    expect(await leesBoetes(testDb)).toHaveLength(1)
  })
})
