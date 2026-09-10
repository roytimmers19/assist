import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { beoordeelNoodrem, maakImportPlan } from '@/lib/domein/reconcile'
import type { BestaandEvent, GeparsedEvent } from '@/lib/domein/types'

const NU = DateTime.fromISO('2026-09-01T12:00', { zone: 'Europe/Amsterdam' }).toJSDate()
const tijd = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Amsterdam' }).toJSDate()

const wedstrijd = (uid: string, iso: string): GeparsedEvent => ({
  icalUid: uid,
  type: 'wedstrijd',
  startOp: tijd(iso),
  eindOp: null,
  locatie: 'Sportpark 1, Voorbeeldstraat 1',
  tegenstander: 'Tegenstander 1 (zon)',
  thuis: true,
})

const training = (uid: string, iso: string): GeparsedEvent => ({
  icalUid: uid,
  type: 'training',
  startOp: tijd(iso),
  eindOp: null,
  locatie: null,
  tegenstander: null,
  thuis: null,
})

const bestaand = (
  id: string,
  uid: string | null,
  type: 'training' | 'wedstrijd',
  iso: string,
): BestaandEvent => ({ id, icalUid: uid, type, startOp: tijd(iso), status: 'gepland' })

describe('maakImportPlan', () => {
  it('voegt alles toe als de database leeg is', () => {
    const plan = maakImportPlan([], [wedstrijd('w1', '2026-09-06T09:30'), training('t1', '2026-09-03T18:30')], NU)
    expect(plan.nieuw).toHaveLength(2)
    expect(plan.bijwerken).toHaveLength(0)
    expect(plan.afgelasten).toHaveLength(0)
  })

  it('wijzigt niets bij een tweede identieke import', () => {
    const binnen = [wedstrijd('w1', '2026-09-06T09:30')]
    const plan = maakImportPlan([bestaand('id-1', 'w1', 'wedstrijd', '2026-09-06T09:30')], binnen, NU)
    expect(plan.nieuw).toHaveLength(0)
    expect(plan.afgelasten).toHaveLength(0)
    // Bijwerken mag: de rij wordt overschreven met dezelfde waarden.
    expect(plan.bijwerken).toEqual([{ id: 'id-1', event: binnen[0] }])
  })

  it('koppelt een verzette wedstrijd op UID en werkt hem bij', () => {
    const plan = maakImportPlan(
      [bestaand('id-1', 'w2', 'wedstrijd', '2026-09-06T09:30')],
      [wedstrijd('w2', '2026-09-06T14:00')],
      NU,
    )
    expect(plan.nieuw).toHaveLength(0)
    expect(plan.afgelasten).toHaveLength(0)
    expect(plan.bijwerken[0].id).toBe('id-1')
    expect(plan.bijwerken[0].event.startOp).toEqual(tijd('2026-09-06T14:00'))
  })

  it('koppelt een verplaatste training binnen dezelfde week ondanks een nieuwe UID', () => {
    // Donderdag 3 september verschuift naar woensdag 2 september; UID verandert mee.
    const plan = maakImportPlan(
      [bestaand('id-t', '2_oud', 'training', '2026-09-03T18:30')],
      [training('2_nieuw', '2026-09-02T19:00')],
      NU,
    )
    expect(plan.nieuw).toHaveLength(0)
    expect(plan.afgelasten).toHaveLength(0)
    expect(plan.bijwerken[0].id).toBe('id-t')
    expect(plan.bijwerken[0].event.icalUid).toBe('2_nieuw')
  })

  it('koppelt niet als er twee trainingen in dezelfde week staan', () => {
    const plan = maakImportPlan(
      [bestaand('id-t', '2_oud', 'training', '2026-09-03T18:30')],
      [training('2_a', '2026-09-01T19:00'), training('2_b', '2026-09-02T19:00')],
      NU,
    )
    expect(plan.bijwerken).toHaveLength(0)
    expect(plan.nieuw).toHaveLength(2)
    expect(plan.afgelasten).toEqual([{ id: 'id-t' }])
  })

  it('koppelt trainingen niet over weekgrenzen heen', () => {
    const plan = maakImportPlan(
      [bestaand('id-t', '2_oud', 'training', '2026-09-03T18:30')],
      [training('2_nieuw', '2026-09-10T18:30')],
      NU,
    )
    expect(plan.bijwerken).toHaveLength(0)
    expect(plan.nieuw).toHaveLength(1)
    expect(plan.afgelasten).toEqual([{ id: 'id-t' }])
  })

  it('gelast een verdwenen toekomstige wedstrijd af in plaats van hem te verwijderen', () => {
    const plan = maakImportPlan([bestaand('id-1', 'w1', 'wedstrijd', '2026-10-04T10:00')], [], NU)
    expect(plan.afgelasten).toEqual([{ id: 'id-1' }])
  })

  it('laat events in het verleden met rust', () => {
    const plan = maakImportPlan([bestaand('id-oud', 'w0', 'wedstrijd', '2026-08-30T10:00')], [], NU)
    expect(plan.afgelasten).toHaveLength(0)
    expect(plan.bijwerken).toHaveLength(0)
  })

  it('gelast een al afgelast event niet nog een keer af', () => {
    const alAfgelast: BestaandEvent = {
      ...bestaand('id-1', 'w1', 'wedstrijd', '2026-10-04T10:00'),
      status: 'afgelast',
    }
    expect(maakImportPlan([alAfgelast], [], NU).afgelasten).toHaveLength(0)
  })
})

describe('beoordeelNoodrem', () => {
  const zesToekomstige = Array.from({ length: 6 }, (_, i) =>
    bestaand(`id-${i}`, `w${i}`, 'wedstrijd', `2026-10-0${i + 1}T10:00`),
  )

  it('laat een gewone import door', () => {
    const plan = { nieuw: [], bijwerken: [], afgelasten: [{ id: 'id-0' }] }
    expect(beoordeelNoodrem(plan, zesToekomstige, NU)).toEqual({ rem: false })
  })

  it('remt als de feed niets opleverde terwijl er wel events zijn', () => {
    const plan = { nieuw: [], bijwerken: [], afgelasten: zesToekomstige.map((e) => ({ id: e.id })) }
    const uitkomst = beoordeelNoodrem(plan, zesToekomstige, NU)
    expect(uitkomst.rem).toBe(true)
  })

  it('remt als meer dan de helft van de toekomstige events afgelast zou worden', () => {
    const plan = {
      nieuw: [],
      bijwerken: [],
      afgelasten: [{ id: 'id-0' }, { id: 'id-1' }, { id: 'id-2' }, { id: 'id-3' }],
    }
    const uitkomst = beoordeelNoodrem(plan, zesToekomstige, NU)
    expect(uitkomst.rem).toBe(true)
    if (uitkomst.rem) expect(uitkomst.reden).toContain('4')
  })

  it('remt niet bij precies de helft', () => {
    const plan = { nieuw: [], bijwerken: [], afgelasten: [{ id: 'id-0' }, { id: 'id-1' }, { id: 'id-2' }] }
    expect(beoordeelNoodrem(plan, zesToekomstige, NU)).toEqual({ rem: false })
  })

  it('remt niet op een lege database bij de allereerste import', () => {
    expect(beoordeelNoodrem({ nieuw: [], bijwerken: [], afgelasten: [] }, [], NU)).toEqual({ rem: false })
  })
})
