import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { leesKomendeAgenda } from '@/lib/db/aanwezigheid'
import {
  bewaarToewijzingen,
  controleerDienst,
  haalDienstWeg,
  leesDiensten,
  wijsDienstToe,
} from '@/lib/db/diensten'
import { diensten, events, spelers } from '@/lib/db/schema'
import { maakSchoon, testDb } from './opzet'

async function nieuwEvent(thuis: boolean): Promise<string> {
  const [rij] = await testDb
    .insert(events)
    .values({
      type: 'wedstrijd',
      startOp: new Date('2026-09-06T07:30:00Z'),
      afmeldDeadline: new Date('2026-09-02T21:59:59Z'),
      tegenstander: 'Tegenstander 2',
      thuis,
    })
    .returning()
  return rij.id
}

async function nieuweSpeler(naam: string, email: string): Promise<string> {
  const [rij] = await testDb
    .insert(spelers)
    .values({ naam, email, accountStatus: 'actief' })
    .returning()
  return rij.id
}

describe('de regels rond een dienst', () => {
  beforeEach(maakSchoon)

  it('bewaart een toewijzing', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    const [rij] = await testDb
      .insert(diensten)
      .values({ eventId, spelerId: bas, soort: 'rijden', toegewezenDoor: bas })
      .returning()

    expect(rij.soort).toBe('rijden')
  })

  it('weigert dezelfde speler twee keer op dezelfde dienst bij hetzelfde event', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await testDb.insert(diensten).values({ eventId, spelerId: bas, soort: 'rijden' })
    await expect(
      testDb.insert(diensten).values({ eventId, spelerId: bas, soort: 'rijden' }),
    ).rejects.toThrow()
  })

  // Onhandig, maar bij een kleine selectie soms onvermijdelijk.
  it('staat beide soorten dienst voor dezelfde speler bij hetzelfde event toe', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await testDb.insert(diensten).values({ eventId, spelerId: bas, soort: 'rijden' })
    await testDb.insert(diensten).values({ eventId, spelerId: bas, soort: 'materiaal' })

    expect(await testDb.select().from(diensten)).toHaveLength(2)
  })

  it('gooit de diensten weg als het event verdwijnt', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb.insert(diensten).values({ eventId, spelerId: bas, soort: 'rijden' })

    await testDb.delete(events)
    expect(await testDb.select().from(diensten)).toEqual([])
  })

  // Het seizoensrooster komt van papier en niet van een leider die op een knop
  // drukte. De kolom is nullbaar; de handtekening moet dat ook toelaten.
  it('bewaart een toewijzing zonder leider erachter', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    const aantal = await bewaarToewijzingen(
      testDb,
      [{ eventId, spelerId: bas, soort: 'rijden' }],
      null,
    )

    expect(aantal).toBe(1)
    const [rij] = await testDb.select().from(diensten).where(eq(diensten.eventId, eventId))
    expect(rij.toegewezenDoor).toBeNull()
  })

  // Het invoerscript moet zonder gevolgen nog eens kunnen draaien; daar leunt
  // het aanvullen van een speler die nu nog geen lid is later op.
  it('schrijft dezelfde reeks twee keer weg zonder er rijen bij te maken', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const reeks = [{ eventId, spelerId: bas, soort: 'materiaal' as const }]

    expect(await bewaarToewijzingen(testDb, reeks, null)).toBe(1)
    expect(await bewaarToewijzingen(testDb, reeks, null)).toBe(0)
    expect(await testDb.select().from(diensten)).toHaveLength(1)
  })
})

describe('diensten lezen en schrijven', () => {
  beforeEach(maakSchoon)

  it('geeft de diensten per event terug', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')

    await wijsDienstToe(testDb, { eventId, spelerId: bas, soort: 'rijden', toegewezenDoor: bas })
    await wijsDienstToe(testDb, {
      eventId,
      spelerId: cor,
      soort: 'materiaal',
      toegewezenDoor: bas,
    })

    const perEvent = await leesDiensten(testDb, [eventId])
    expect(perEvent.get(eventId)).toHaveLength(2)
  })

  it('geeft een lege kaart terug zonder events', async () => {
    expect(await leesDiensten(testDb, [])).toEqual(new Map())
  })

  // Twee keer op dezelfde naam tikken is geen fout, gewoon niets nieuws.
  it('doet niets als dezelfde dienst nog eens wordt toegewezen', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await wijsDienstToe(testDb, { eventId, spelerId: bas, soort: 'rijden', toegewezenDoor: bas })
    await wijsDienstToe(testDb, { eventId, spelerId: bas, soort: 'rijden', toegewezenDoor: bas })

    expect(await testDb.select().from(diensten)).toHaveLength(1)
  })

  it('haalt precies die ene dienst weg', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await wijsDienstToe(testDb, { eventId, spelerId: bas, soort: 'rijden', toegewezenDoor: bas })
    await wijsDienstToe(testDb, {
      eventId,
      spelerId: bas,
      soort: 'materiaal',
      toegewezenDoor: bas,
    })
    await haalDienstWeg(testDb, { eventId, spelerId: bas, soort: 'rijden' })

    const over = await testDb.select().from(diensten)
    expect(over.map((r) => r.soort)).toEqual(['materiaal'])
  })

  it('bewaart een reeks toewijzingen in één keer', async () => {
    const eventId = await nieuwEvent(false)
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')

    const aantal = await bewaarToewijzingen(
      testDb,
      [
        { eventId, spelerId: bas, soort: 'materiaal' },
        { eventId, spelerId: cor, soort: 'materiaal' },
      ],
      bas,
    )

    expect(aantal).toBe(2)
    expect(await testDb.select().from(diensten)).toHaveLength(2)
  })

  it('bewaart een lege reeks zonder te klagen', async () => {
    expect(await bewaarToewijzingen(testDb, [], 'maakt-niet-uit')).toBe(0)
  })

  it('leest alle komende events, niet alleen de eerste paar', async () => {
    await nieuwEvent(true)
    await nieuwEvent(false)

    const komend = await leesKomendeAgenda(testDb, new Date('2026-09-01T00:00:00Z'))
    expect(komend).toHaveLength(2)
  })

  // Het rooster blijft aanpasbaar, dus een afgelaste wedstrijd hoort in beeld.
  it('neemt afgelaste events wél mee', async () => {
    const eventId = await nieuwEvent(false)
    await testDb.update(events).set({ status: 'afgelast' }).where(eq(events.id, eventId))

    const komend = await leesKomendeAgenda(testDb, new Date('2026-09-01T00:00:00Z'))
    expect(komend).toHaveLength(1)
  })
})

describe('welke dienst waar mag', () => {
  beforeEach(maakSchoon)

  async function leesEvent(eventId: string) {
    const [event] = await testDb.select().from(events).where(eq(events.id, eventId))
    return event
  }

  it('weigert rijdienst bij een thuiswedstrijd', async () => {
    const event = await leesEvent(await nieuwEvent(true))
    expect(() => controleerDienst(event, 'rijden')).toThrow('Bij een thuiswedstrijd rijdt niemand')
  })

  it('staat rijdienst toe bij een uitwedstrijd', async () => {
    const event = await leesEvent(await nieuwEvent(false))
    expect(() => controleerDienst(event, 'rijden')).not.toThrow()
  })

  it('staat materiaaldienst overal toe', async () => {
    const event = await leesEvent(await nieuwEvent(true))
    expect(() => controleerDienst(event, 'materiaal')).not.toThrow()
  })

  // Het rooster gaat nooit op slot, ook niet als de wedstrijd niet doorgaat.
  it('staat een dienst bij een afgelast event gewoon toe', async () => {
    const eventId = await nieuwEvent(false)
    await testDb.update(events).set({ status: 'afgelast' }).where(eq(events.id, eventId))
    const event = await leesEvent(eventId)

    expect(() => controleerDienst(event, 'materiaal')).not.toThrow()
    expect(() => controleerDienst(event, 'rijden')).not.toThrow()
  })
})
