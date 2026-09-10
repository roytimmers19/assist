import { describe, expect, it } from 'vitest'
import type { Afwezigheid } from '@/lib/domein/afwezigheid'
import { dagVan, isAfwezigOp, selectieVoor } from '@/lib/domein/afwezigheid'

function periode(van: string, terugOp: string | null, spelerId = 'bas'): Afwezigheid {
  return { spelerId, van, terugOp }
}

describe('dagVan', () => {
  it('rekent op de Nederlandse kalenderdag en niet op de UTC-dag', () => {
    // 14 oktober 22:30 UTC is in Nederland al 15 oktober 00:30.
    expect(dagVan(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15')
  })

  it('houdt rekening met de wintertijd', () => {
    // Na de overgang staat Nederland op UTC+1.
    expect(dagVan(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02')
  })
})

describe('isAfwezigOp', () => {
  const blessure = periode('2026-09-01', '2026-10-15')

  it('is afwezig op de eerste dag van de periode', () => {
    expect(isAfwezigOp(blessure, new Date('2026-09-01T08:00:00Z'))).toBe(true)
  })

  it('is aanwezig op de dag ervoor', () => {
    expect(isAfwezigOp(blessure, new Date('2026-08-31T08:00:00Z'))).toBe(false)
  })

  // Dit is de hele reden dat het interval half open is.
  it('is aanwezig op de terugkeerdag zelf', () => {
    expect(isAfwezigOp(blessure, new Date('2026-10-15T08:00:00Z'))).toBe(false)
  })

  it('is afwezig op de dag voor de terugkeerdag', () => {
    expect(isAfwezigOp(blessure, new Date('2026-10-14T08:00:00Z'))).toBe(true)
  })

  it('blijft bij een open einde afwezig', () => {
    const open = periode('2026-09-01', null)
    expect(isAfwezigOp(open, new Date('2027-05-01T08:00:00Z'))).toBe(true)
  })

  // Zonder Nederlandse kalenderdag zou dit event op 14 oktober vallen en dus
  // binnen de periode: precies de fout die deze test moet vangen.
  it('rekent een avondwedstrijd op de Nederlandse dag', () => {
    expect(isAfwezigOp(blessure, new Date('2026-10-14T22:30:00Z'))).toBe(false)
  })

  it('werkt over de zomer-wintertijdovergang heen', () => {
    const najaar = periode('2026-10-25', '2026-11-02')
    expect(isAfwezigOp(najaar, new Date('2026-11-01T13:00:00Z'))).toBe(true)
    expect(isAfwezigOp(najaar, new Date('2026-11-02T13:00:00Z'))).toBe(false)
  })
})

describe('selectieVoor', () => {
  const moment = new Date('2026-09-06T07:30:00Z')

  it('haalt de afwezigen eruit en laat de volgorde staan', () => {
    const uit = selectieVoor(
      ['bas', 'cor', 'dirk'],
      [periode('2026-09-01', '2026-10-15', 'cor')],
      moment,
    )
    expect(uit).toEqual(['bas', 'dirk'])
  })

  it('laat een periode die nog niet begonnen is met rust', () => {
    const uit = selectieVoor(['bas'], [periode('2026-12-01', null, 'bas')], moment)
    expect(uit).toEqual(['bas'])
  })

  it('negeert een periode van iemand die niet in de lijst staat', () => {
    const uit = selectieVoor(['bas'], [periode('2026-09-01', null, 'onbekend')], moment)
    expect(uit).toEqual(['bas'])
  })

  it('geeft een lege lijst als iedereen weg is', () => {
    const uit = selectieVoor(['bas'], [periode('2026-09-01', '2026-10-15', 'bas')], moment)
    expect(uit).toEqual([])
  })
})
