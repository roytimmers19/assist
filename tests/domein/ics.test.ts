import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { parseIcs } from '@/lib/domein/ics'

const TEAM = 'SV Voorbeeld 2 (zon)'
const feed = readFileSync(join(process.cwd(), 'tests/fixtures/seizoen-2026-08-29.ics'), 'utf8')

/** Hulpje: toon een tijdstip als wandkloktijd in Amsterdam. */
const amsterdam = (d: Date) => DateTime.fromJSDate(d).setZone('Europe/Amsterdam').toFormat('yyyy-MM-dd HH:mm')

describe('parseIcs op de echte feed', () => {
  const resultaat = parseIcs(feed, TEAM)

  it('leest alle 68 events', () => {
    expect(resultaat.events).toHaveLength(68)
    expect(resultaat.overgeslagen).toBe(0)
  })

  it('verdeelt ze in 25 wedstrijden en 43 trainingen', () => {
    const wedstrijden = resultaat.events.filter((e) => e.type === 'wedstrijd')
    const trainingen = resultaat.events.filter((e) => e.type === 'training')
    expect(wedstrijden).toHaveLength(25)
    expect(trainingen).toHaveLength(43)
  })

  it('zet alle trainingen op donderdag 18:30, niet op woensdag', () => {
    const trainingen = resultaat.events.filter((e) => e.type === 'training')
    for (const t of trainingen) {
      const dt = DateTime.fromJSDate(t.startOp).setZone('Europe/Amsterdam')
      expect(dt.weekday).toBe(4)
      expect(dt.toFormat('HH:mm')).toBe('18:30')
    }
  })

  it('leidt een thuiswedstrijd af uit de SUMMARY', () => {
    const eerste = resultaat.events.find((e) => e.icalUid === '100000001')
    expect(eerste).toBeDefined()
    expect(eerste!.thuis).toBe(true)
    expect(eerste!.tegenstander).toBe('Tegenstander 1 (zon)')
    expect(amsterdam(eerste!.startOp)).toBe('2026-08-30 10:00')
    expect(eerste!.locatie).toBe('Sportpark 1, Voorbeeldstraat 1')
  })

  it('leidt een uitwedstrijd af uit de SUMMARY', () => {
    const uit = resultaat.events.find((e) => e.icalUid === '100000002')
    expect(uit).toBeDefined()
    expect(uit!.thuis).toBe(false)
    expect(uit!.tegenstander).toBe('Tegenstander 2 (zon)')
    expect(amsterdam(uit!.startOp)).toBe('2026-09-06 09:30')
  })

  it('geeft trainingen geen tegenstander en geen locatie', () => {
    const training = resultaat.events.find((e) => e.type === 'training')!
    expect(training.tegenstander).toBeNull()
    expect(training.thuis).toBeNull()
    expect(training.locatie).toBeNull()
  })
})

describe('parseIcs op afwijkende invoer', () => {
  const omhulsel = (vevent: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${vevent}\r\nEND:VCALENDAR`

  it('slaat een onbekende CATEGORIES over in plaats van te raden', () => {
    const resultaat = parseIcs(
      omhulsel(
        'BEGIN:VEVENT\r\nCATEGORIES:Vergadering\r\nDTSTART;TZID=Europe/Amsterdam:20261001T200000\r\nDTEND;TZID=Europe/Amsterdam:20261001T220000\r\nSUMMARY:Bestuursvergadering\r\nUID:zomaar-1\r\nEND:VEVENT',
      ),
      TEAM,
    )
    expect(resultaat.events).toHaveLength(0)
    expect(resultaat.overgeslagen).toBe(1)
  })

  it('neemt een wedstrijd zonder het woord tegen gewoon op, met lege tegenstander', () => {
    const resultaat = parseIcs(
      omhulsel(
        'BEGIN:VEVENT\r\nCATEGORIES:Wedstrijdprogramma van SV Voorbeeld 2 (zon)\r\nDTSTART;TZID=Europe/Amsterdam:20261004T100000\r\nDTEND;TZID=Europe/Amsterdam:20261004T114500\r\nSUMMARY:SV Voorbeeld 2 (zon) - Onbekend 1\r\nUID:raar-1\r\nEND:VEVENT',
      ),
      TEAM,
    )
    expect(resultaat.events).toHaveLength(1)
    expect(resultaat.events[0].tegenstander).toBeNull()
    expect(resultaat.events[0].thuis).toBeNull()
    expect(resultaat.waarschuwingen).toHaveLength(1)
  })

  it('vouwt afgebroken regels weer aan elkaar', () => {
    const resultaat = parseIcs(
      omhulsel(
        // De vouw valt na de spatie: bij het ontvouwen verdwijnt het eerste teken
        // van de vervolgregel, dus de spatie moet aan het eind van de vorige staan.
        'BEGIN:VEVENT\r\nCATEGORIES:Wedstrijdprogramma van SV Voorbeeld 2 (zon)\r\nDTSTART;TZID=Europe/Amsterdam:20261004T100000\r\nDTEND;TZID=Europe/Amsterdam:20261004T114500\r\nLOCATION:Sportpark Heel Lang\\, Straatnaam \r\n 123\r\nSUMMARY:SV Voorbeeld 2 (zon) tegen X 1 (zon)\r\nUID:vouw-1\r\nEND:VEVENT',
      ),
      TEAM,
    )
    expect(resultaat.events[0].locatie).toBe('Sportpark Heel Lang, Straatnaam 123')
  })

  it('rekent wintertijd goed om', () => {
    const resultaat = parseIcs(
      omhulsel(
        'BEGIN:VEVENT\r\nCATEGORIES:Wedstrijdprogramma van SV Voorbeeld 2 (zon)\r\nDTSTART;TZID=Europe/Amsterdam:20261206T140000\r\nDTEND;TZID=Europe/Amsterdam:20261206T154500\r\nSUMMARY:SV Voorbeeld 2 (zon) tegen X 1 (zon)\r\nUID:winter-1\r\nEND:VEVENT',
      ),
      TEAM,
    )
    expect(resultaat.events[0].startOp.toISOString()).toBe('2026-12-06T13:00:00.000Z')
  })

  it('rekent zomertijd goed om', () => {
    const resultaat = parseIcs(
      omhulsel(
        'BEGIN:VEVENT\r\nCATEGORIES:Wedstrijdprogramma van SV Voorbeeld 2 (zon)\r\nDTSTART;TZID=Europe/Amsterdam:20270606T140000\r\nDTEND;TZID=Europe/Amsterdam:20270606T154500\r\nSUMMARY:SV Voorbeeld 2 (zon) tegen X 1 (zon)\r\nUID:zomer-1\r\nEND:VEVENT',
      ),
      TEAM,
    )
    expect(resultaat.events[0].startOp.toISOString()).toBe('2027-06-06T12:00:00.000Z')
  })
})
