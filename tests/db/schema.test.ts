import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { aanwezigheid, events, spelers } from '@/lib/db/schema'

describe('schema', () => {
  beforeEach(async () => {
    await maakSchoon()
  })

  it('legt de zes eigen tabellen aan', async () => {
    const rijen = await testDb.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    )
    const namen = rijen.map((r) => r.table_name as string)
    for (const naam of [
      'aanwezigheid',
      'event',
      'eventtype_instelling',
      'import_run',
      'speler',
      'team_instelling',
      'uitnodiging',
    ]) {
      expect(namen).toContain(naam)
    }
  })

  it('vult de twee eventtype-instellingen met 24 en 48 uur', async () => {
    const rijen = await testDb.execute(
      sql`select type, deadline_uren_voor_aanvang from eventtype_instelling order by type`,
    )
    expect(rijen).toEqual([
      { type: 'training', deadline_uren_voor_aanvang: 24 },
      { type: 'wedstrijd', deadline_uren_voor_aanvang: 48 },
    ])
  })

  it('staat maar één event per ical_uid toe', async () => {
    const maak = () => ({
      type: 'wedstrijd' as const,
      startOp: new Date('2026-09-06T07:30:00Z'),
      icalUid: 'zelfde-uid',
      afmeldDeadline: new Date('2026-09-04T07:30:00Z'),
    })
    await testDb.insert(events).values(maak())
    await expect(testDb.insert(events).values(maak())).rejects.toThrow()
  })

  it('staat meerdere handmatige events zonder ical_uid toe', async () => {
    const maak = () => ({
      type: 'training' as const,
      startOp: new Date('2026-09-03T16:30:00Z'),
      bron: 'handmatig' as const,
      afmeldDeadline: new Date('2026-09-02T16:30:00Z'),
    })
    await testDb.insert(events).values(maak())
    await expect(testDb.insert(events).values(maak())).resolves.toBeDefined()
  })

  it('bewaart elke aanwezigheidsmelding als een nieuwe rij', async () => {
    const [speler] = await testDb
      .insert(spelers)
      .values({ naam: 'Bas', email: 'bas@voorbeeld.nl' })
      .returning()
    const [event] = await testDb
      .insert(events)
      .values({
        type: 'wedstrijd',
        startOp: new Date('2026-09-06T07:30:00Z'),
        icalUid: 'w-1',
        afmeldDeadline: new Date('2026-09-04T07:30:00Z'),
      })
      .returning()

    await testDb.insert(aanwezigheid).values({
      eventId: event.id,
      spelerId: speler.id,
      status: 'nee',
      bron: 'speler',
      gezetOp: new Date('2026-09-04T19:14:00Z'),
    })
    await testDb.insert(aanwezigheid).values({
      eventId: event.id,
      spelerId: speler.id,
      status: 'ja',
      bron: 'speler',
      gezetOp: new Date('2026-09-05T07:02:00Z'),
    })

    const rijen = await testDb.select().from(aanwezigheid)
    expect(rijen).toHaveLength(2)
  })

  it('eist een uniek e-mailadres per speler', async () => {
    await testDb.insert(spelers).values({ naam: 'Bas', email: 'bas@voorbeeld.nl' })
    await expect(
      testDb.insert(spelers).values({ naam: 'Bas Dubbel', email: 'bas@voorbeeld.nl' }),
    ).rejects.toThrow()
  })
})
