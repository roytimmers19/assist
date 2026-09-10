import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { leesKomendeEvents, leesMeldingen, zetAanwezigheid } from '@/lib/db/aanwezigheid'
import { actueleStand } from '@/lib/domein/aanwezigheid'
import { events, spelers } from '@/lib/db/schema'

async function opzet() {
  const [speler] = await testDb
    .insert(spelers)
    .values({ naam: 'Bas', email: 'bas@voorbeeld.nl', accountStatus: 'actief' })
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
  return { speler, event }
}

describe('aanwezigheid vastleggen', () => {
  beforeEach(async () => {
    await maakSchoon()
  })

  it('schrijft een afmelding weg met toelichting', async () => {
    const { speler, event } = await opzet()
    await zetAanwezigheid(testDb, {
      eventId: event.id,
      spelerId: speler.id,
      status: 'nee',
      bron: 'speler',
      toelichting: 'rug',
      gezetDoorSpelerId: speler.id,
    })

    const meldingen = await leesMeldingen(testDb, [event.id])
    const stand = actueleStand([{ id: speler.id, standaard: 'ja' }], meldingen.get(event.id) ?? [])
    expect(stand[0]).toMatchObject({ status: 'nee', bron: 'speler', toelichting: 'rug' })
  })

  it('schrijft geen tweede rij als de stand niet verandert', async () => {
    const { speler, event } = await opzet()
    const invoer = {
      eventId: event.id,
      spelerId: speler.id,
      status: 'nee' as const,
      bron: 'speler' as const,
      toelichting: null,
      gezetDoorSpelerId: speler.id,
    }
    await zetAanwezigheid(testDb, invoer)
    await zetAanwezigheid(testDb, invoer)

    const meldingen = await leesMeldingen(testDb, [event.id])
    expect(meldingen.get(event.id)).toHaveLength(1)
  })

  it('legt een bevestiging vast, zodat stilte van bevestiging te onderscheiden blijft', async () => {
    const { speler, event } = await opzet()
    await zetAanwezigheid(testDb, {
      eventId: event.id,
      spelerId: speler.id,
      status: 'ja',
      bron: 'speler',
      toelichting: null,
      gezetDoorSpelerId: speler.id,
    })
    expect((await leesMeldingen(testDb, [event.id])).get(event.id)).toHaveLength(1)
  })

  it('bewaart de hele reeks bij heen en weer melden', async () => {
    const { speler, event } = await opzet()
    for (const status of ['nee', 'ja', 'nee'] as const) {
      await zetAanwezigheid(testDb, {
        eventId: event.id,
        spelerId: speler.id,
        status,
        bron: 'speler',
        toelichting: null,
        gezetDoorSpelerId: speler.id,
      })
    }
    expect((await leesMeldingen(testDb, [event.id])).get(event.id)).toHaveLength(3)
  })

  it('laat afgelaste events buiten de komende events', async () => {
    await opzet()
    await testDb.insert(events).values({
      type: 'training',
      startOp: new Date('2026-09-03T16:30:00Z'),
      icalUid: 't-1',
      status: 'afgelast',
      afmeldDeadline: new Date('2026-09-02T16:30:00Z'),
    })

    const komend = await leesKomendeEvents(testDb, new Date('2026-09-01T00:00:00Z'), 10)
    expect(komend).toHaveLength(1)
    expect(komend[0].icalUid).toBe('w-1')
  })
})
