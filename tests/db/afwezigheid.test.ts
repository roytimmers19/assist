import { beforeEach, describe, expect, it } from 'vitest'
import {
  beeindigAfwezigheid,
  leesAfwezighedenTussen,
  leesAfwezighedenVanSpeler,
  leesLopendeAfwezigheden,
  maakAfwezigheid,
  wijzigAfwezigheid,
} from '@/lib/db/afwezigheid'
import { afwezigheden, spelers } from '@/lib/db/schema'
import { maakSchoon, testDb } from './opzet'

async function nieuweSpeler(naam: string, email: string): Promise<string> {
  const [rij] = await testDb
    .insert(spelers)
    .values({ naam, email, accountStatus: 'actief' })
    .returning()
  return rij.id
}

describe('de regels rond een afwezigheid', () => {
  beforeEach(maakSchoon)

  it('bewaart een periode met een terugkeerdatum', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const [rij] = await testDb
      .insert(afwezigheden)
      .values({
        spelerId: bas,
        van: '2026-09-01',
        terugOp: '2026-10-15',
        reden: 'Kruisband',
        gezetDoor: bas,
      })
      .returning()

    expect(rij.van).toBe('2026-09-01')
    expect(rij.terugOp).toBe('2026-10-15')
  })

  it('bewaart een open einde', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const [rij] = await testDb
      .insert(afwezigheden)
      .values({ spelerId: bas, van: '2026-09-01', reden: 'Onbekend', gezetDoor: bas })
      .returning()

    expect(rij.terugOp).toBeNull()
  })

  it('weigert een lege reden', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(
      testDb
        .insert(afwezigheden)
        .values({ spelerId: bas, van: '2026-09-01', reden: '', gezetDoor: bas }),
    ).rejects.toThrow()
  })

  // Niet alleen not null: een veld met één spatie is net zo onbruikbaar.
  it('weigert een reden van alleen spaties', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(
      testDb
        .insert(afwezigheden)
        .values({ spelerId: bas, van: '2026-09-01', reden: '   ', gezetDoor: bas }),
    ).rejects.toThrow()
  })

  it('weigert een terugkeerdag die niet ná het begin ligt', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(
      testDb.insert(afwezigheden).values({
        spelerId: bas,
        van: '2026-09-01',
        terugOp: '2026-09-01',
        reden: 'Nul dagen',
        gezetDoor: bas,
      }),
    ).rejects.toThrow()
  })

  it('weigert twee overlappende periodes van dezelfde speler', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb.insert(afwezigheden).values({
      spelerId: bas,
      van: '2026-09-01',
      terugOp: '2026-10-15',
      reden: 'Kruisband',
      gezetDoor: bas,
    })

    await expect(
      testDb.insert(afwezigheden).values({
        spelerId: bas,
        van: '2026-10-01',
        terugOp: '2026-11-01',
        reden: 'Vakantie',
        gezetDoor: bas,
      }),
    ).rejects.toThrow()
  })

  // Aansluitend mag wél: de terugkeerdag valt buiten de eerste periode.
  it('staat een periode toe die precies op de terugkeerdag begint', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb.insert(afwezigheden).values({
      spelerId: bas,
      van: '2026-09-01',
      terugOp: '2026-10-15',
      reden: 'Kruisband',
      gezetDoor: bas,
    })

    await testDb.insert(afwezigheden).values({
      spelerId: bas,
      van: '2026-10-15',
      terugOp: '2026-11-01',
      reden: 'Vakantie',
      gezetDoor: bas,
    })

    expect(await testDb.select().from(afwezigheden)).toHaveLength(2)
  })

  it('laat dezelfde dagen voor een andere speler wel toe', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    const dagen = { van: '2026-09-01', terugOp: '2026-10-15', reden: 'Griep' }

    await testDb.insert(afwezigheden).values({ ...dagen, spelerId: bas, gezetDoor: bas })
    await testDb.insert(afwezigheden).values({ ...dagen, spelerId: cor, gezetDoor: cor })

    expect(await testDb.select().from(afwezigheden)).toHaveLength(2)
  })
})

describe('afwezigheden lezen en schrijven', () => {
  beforeEach(maakSchoon)

  async function blessure(spelerId: string, van: string, terugOp: string | null) {
    return maakAfwezigheid(testDb, {
      spelerId,
      van,
      terugOp,
      reden: 'Kruisband',
      gezetDoor: spelerId,
    })
  }

  it('geeft de periodes terug die het gevraagde venster raken', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await blessure(bas, '2026-09-01', '2026-10-15')

    const raakt = await leesAfwezighedenTussen(
      testDb,
      new Date('2026-10-05T00:00:00Z'),
      new Date('2026-10-12T00:00:00Z'),
    )
    expect(raakt).toEqual([{ spelerId: bas, van: '2026-09-01', terugOp: '2026-10-15' }])
  })

  it('laat een periode weg die vóór het venster afliep', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await blessure(bas, '2026-09-01', '2026-10-15')

    const raakt = await leesAfwezighedenTussen(
      testDb,
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-11-08T00:00:00Z'),
    )
    expect(raakt).toEqual([])
  })

  it('neemt een open einde altijd mee zodra hij begonnen is', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await blessure(bas, '2026-09-01', null)

    const raakt = await leesAfwezighedenTussen(
      testDb,
      new Date('2027-05-01T00:00:00Z'),
      new Date('2027-05-08T00:00:00Z'),
    )
    expect(raakt).toHaveLength(1)
  })

  it('beëindigt een lopende periode per vandaag', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const periode = await blessure(bas, '2026-09-01', null)

    await beeindigAfwezigheid(testDb, {
      id: periode.id,
      vandaag: '2026-09-20',
      alleenVanSpeler: bas,
    })

    const [gelezen] = await leesAfwezighedenVanSpeler(testDb, bas)
    expect(gelezen.terugOp).toBe('2026-09-20')
  })

  // Een periode van nul dagen bestaat niet, en er is geen geschiedenis te
  // bewaren van iets wat nooit begonnen is.
  it('verwijdert een periode die vandaag of later begint in plaats van hem af te sluiten', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const periode = await blessure(bas, '2026-09-20', null)

    await beeindigAfwezigheid(testDb, {
      id: periode.id,
      vandaag: '2026-09-20',
      alleenVanSpeler: bas,
    })

    expect(await leesAfwezighedenVanSpeler(testDb, bas)).toEqual([])
  })

  it('laat een speler de periode van een ander niet beëindigen', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    const periode = await blessure(bas, '2026-09-01', null)

    await expect(
      beeindigAfwezigheid(testDb, {
        id: periode.id,
        vandaag: '2026-09-20',
        alleenVanSpeler: cor,
      }),
    ).rejects.toThrow()

    expect(await leesAfwezighedenVanSpeler(testDb, bas)).toHaveLength(1)
  })

  it('laat een speler de periode van een ander niet wijzigen', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    const periode = await blessure(bas, '2026-09-01', null)

    await expect(
      wijzigAfwezigheid(testDb, {
        id: periode.id,
        van: '2026-09-01',
        terugOp: '2026-09-05',
        reden: 'Overgenomen',
        alleenVanSpeler: cor,
      }),
    ).rejects.toThrow()
  })

  it('geeft een leesbare melding bij een overlappende periode', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await blessure(bas, '2026-09-01', '2026-10-15')

    await expect(blessure(bas, '2026-10-01', '2026-11-01')).rejects.toThrow(
      'Er loopt al een periode over die dagen.',
    )
  })

  it('geeft alleen de periodes terug die nu lopen', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    await blessure(bas, '2026-09-01', '2026-10-15')
    await blessure(cor, '2026-11-01', null)

    const lopend = await leesLopendeAfwezigheden(testDb, new Date('2026-09-20T12:00:00Z'))
    expect(lopend.map((p) => p.spelerId)).toEqual([bas])
  })

  it('laat de leider zonder beperking wijzigen', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const periode = await blessure(bas, '2026-09-01', null)

    await wijzigAfwezigheid(testDb, {
      id: periode.id,
      van: '2026-09-01',
      terugOp: '2026-09-05',
      reden: 'Eerder terug',
      alleenVanSpeler: null,
    })

    const [gelezen] = await leesAfwezighedenVanSpeler(testDb, bas)
    expect(gelezen.terugOp).toBe('2026-09-05')
    expect(gelezen.reden).toBe('Eerder terug')
  })
})
