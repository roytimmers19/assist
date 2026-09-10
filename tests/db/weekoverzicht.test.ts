import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { leesEventsInWeek } from '@/lib/db/weekoverzicht'
import { events } from '@/lib/db/schema'

describe('leesEventsInWeek', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.insert(events).values([
      {
        type: 'training',
        startOp: new Date('2026-09-03T16:30:00Z'),
        icalUid: 't-1',
        afmeldDeadline: new Date('2026-09-02T16:30:00Z'),
      },
      {
        type: 'wedstrijd',
        startOp: new Date('2026-09-06T07:30:00Z'),
        icalUid: 'w-1',
        afmeldDeadline: new Date('2026-09-04T07:30:00Z'),
      },
      {
        type: 'wedstrijd',
        startOp: new Date('2026-09-13T08:00:00Z'),
        icalUid: 'w-2',
        afmeldDeadline: new Date('2026-09-11T08:00:00Z'),
      },
    ])
  })

  it('geeft alleen de events binnen het venster, op tijd gesorteerd', async () => {
    const rijen = await leesEventsInWeek(
      testDb,
      new Date('2026-08-31T00:00:00Z'),
      new Date('2026-09-07T00:00:00Z'),
    )
    expect(rijen.map((r) => r.icalUid)).toEqual(['t-1', 'w-1'])
  })

  it('toont afgelaste events wel, zodat de leider ze niet mist', async () => {
    await testDb.insert(events).values({
      type: 'wedstrijd',
      startOp: new Date('2026-09-05T09:00:00Z'),
      icalUid: 'w-af',
      status: 'afgelast',
      afmeldDeadline: new Date('2026-09-03T09:00:00Z'),
    })
    const rijen = await leesEventsInWeek(
      testDb,
      new Date('2026-08-31T00:00:00Z'),
      new Date('2026-09-07T00:00:00Z'),
    )
    expect(rijen.map((r) => r.icalUid)).toContain('w-af')
  })
})
