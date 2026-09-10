import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq, sql } from 'drizzle-orm'
import { DateTime } from 'luxon'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { voerImportUit } from '@/lib/import/uitvoeren'
import { aanwezigheid, events, spelers, teamInstelling } from '@/lib/db/schema'

const feed = readFileSync(join(process.cwd(), 'tests/fixtures/seizoen-2026-08-29.ics'), 'utf8')
const NU = DateTime.fromISO('2026-08-29T12:00', { zone: 'Europe/Amsterdam' }).toJSDate()

async function zetInstellingen() {
  await testDb.insert(teamInstelling).values({
    id: 1,
    teamnaam: 'SV Voorbeeld 2 (zon)',
    icsUrl: 'http://voorbeeld.test/ical',
    teamcode: 'VB2',
  })
}

describe('voerImportUit', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table team_instelling`)
    await zetInstellingen()
  })

  it('zet bij de eerste import het hele seizoen neer', async () => {
    const uitkomst = await voerImportUit(testDb, feed, NU)
    expect(uitkomst.status).toBe('ok')
    expect(uitkomst.nieuw).toBe(68)
    expect(uitkomst.afgelast).toBe(0)

    const rijen = await testDb.select().from(events)
    expect(rijen).toHaveLength(68)
  })

  it('berekent de deadline uit de instellingen', async () => {
    await voerImportUit(testDb, feed, NU)
    const [eerste] = await testDb.select().from(events).where(eq(events.icalUid, '100000001'))
    // Wedstrijd zondag 30 augustus 10:00, 48 uur ervoor is vrijdag 28 augustus 10:00.
    expect(
      DateTime.fromJSDate(eerste.afmeldDeadline).setZone('Europe/Amsterdam').toFormat('yyyy-MM-dd HH:mm'),
    ).toBe('2026-08-28 10:00')
  })

  it('wijzigt niets bij een tweede identieke import', async () => {
    await voerImportUit(testDb, feed, NU)
    const tweede = await voerImportUit(testDb, feed, NU)
    expect(tweede.nieuw).toBe(0)
    expect(tweede.afgelast).toBe(0)
    expect(await testDb.select().from(events)).toHaveLength(68)
  })

  it('houdt afmeldingen vast als een training verplaatst wordt', async () => {
    await voerImportUit(testDb, feed, NU)

    const [speler] = await testDb
      .insert(spelers)
      .values({ naam: 'Bas', email: 'bas@voorbeeld.nl' })
      .returning()
    const [training] = await testDb
      .select()
      .from(events)
      .where(eq(events.icalUid, '2_000000000000000000001'))
    await testDb.insert(aanwezigheid).values({
      eventId: training.id,
      spelerId: speler.id,
      status: 'nee',
      bron: 'speler',
    })

    // Diezelfde training verschuift naar woensdag en krijgt daarmee een nieuwe UID.
    const verplaatst = feed
      .replace('2_000000000000000000001', '2_999999999999999999999')
      .replace(
        'DTSTART;TZID=Europe/Amsterdam:20260903T183000',
        'DTSTART;TZID=Europe/Amsterdam:20260902T190000',
      )
      .replace(
        'DTEND;TZID=Europe/Amsterdam:20260903T200000',
        'DTEND;TZID=Europe/Amsterdam:20260902T203000',
      )

    const uitkomst = await voerImportUit(testDb, verplaatst, NU)
    expect(uitkomst.nieuw).toBe(0)
    expect(uitkomst.afgelast).toBe(0)

    expect(await testDb.select().from(events)).toHaveLength(68)
    const [naderhand] = await testDb.select().from(events).where(eq(events.id, training.id))
    expect(naderhand.icalUid).toBe('2_999999999999999999999')

    const meldingen = await testDb.select().from(aanwezigheid)
    expect(meldingen).toHaveLength(1)
    expect(meldingen[0].eventId).toBe(training.id)
  })

  it('breekt af op een lege feed zonder iets te wijzigen', async () => {
    await voerImportUit(testDb, feed, NU)
    const uitkomst = await voerImportUit(testDb, 'BEGIN:VCALENDAR\r\nEND:VCALENDAR', NU)

    expect(uitkomst.status).toBe('afgebroken')
    expect(uitkomst.melding).toContain('Afgebroken')
    const rijen = await testDb.select().from(events)
    expect(rijen).toHaveLength(68)
    expect(rijen.every((r) => r.status === 'gepland')).toBe(true)
  })
})
