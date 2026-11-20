import { describe, expect, it } from 'vitest'
import { alsId, kiesSpelers, leesBoeteKeuze } from '@/lib/weergave/boeteformulier'

const soorten = [
  { id: 's-1', omschrijving: 'Te laat op training', bedragCent: 200, actief: true },
  { id: 's-2', omschrijving: 'Oude boete', bedragCent: 100, actief: false },
]

describe('leesBoeteKeuze', () => {
  it('neemt omschrijving en bedrag over van een vaste boete', () => {
    expect(leesBoeteKeuze({ soort: 's-1', omschrijving: '', bedrag: '' }, soorten)).toEqual({
      soortId: 's-1',
      omschrijving: 'Te laat op training',
      bedragCent: 200,
    })
  })

  it('leest een eigen boete met omschrijving en bedrag', () => {
    expect(
      leesBoeteKeuze({ soort: 'anders', omschrijving: ' Bal over het hek ', bedrag: '1,50' }, soorten),
    ).toEqual({ soortId: null, omschrijving: 'Bal over het hek', bedragCent: 150 })
  })

  it('zegt wat er mist bij een eigen boete', () => {
    expect(leesBoeteKeuze({ soort: 'anders', omschrijving: '', bedrag: '2' }, soorten)).toEqual({
      fout: 'omschrijving',
    })
    expect(
      leesBoeteKeuze({ soort: 'anders', omschrijving: 'Bal over het hek', bedrag: '0' }, soorten),
    ).toEqual({ fout: 'bedrag' })
  })

  it('weigert een onbekende of uitgezette vaste boete, en geen keuze', () => {
    expect(leesBoeteKeuze({ soort: 's-9', omschrijving: '', bedrag: '' }, soorten)).toEqual({
      fout: 'soort',
    })
    expect(leesBoeteKeuze({ soort: 's-2', omschrijving: '', bedrag: '' }, soorten)).toEqual({
      fout: 'soort',
    })
    expect(leesBoeteKeuze({ soort: '', omschrijving: '', bedrag: '' }, soorten)).toEqual({
      fout: 'soort',
    })
  })
})

describe('kiesSpelers', () => {
  const aap = '0b1f6c1e-2a4e-4c35-9f0f-2d3a3c4b5a61'
  const noot = '5c2d7e8f-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
  const weg = '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b1a'

  it('neemt elke speler één keer, en alleen wie in de ploeg zit', () => {
    expect(kiesSpelers([aap, noot, aap, weg, 'geen-id'], [aap, noot])).toEqual([aap, noot])
  })
})

describe('alsId', () => {
  it('laat een id door en maakt van al het andere niets', () => {
    expect(alsId('0b1f6c1e-2a4e-4c35-9f0f-2d3a3c4b5a61')).toBe('0b1f6c1e-2a4e-4c35-9f0f-2d3a3c4b5a61')
    expect(alsId('')).toBeNull()
    expect(alsId("1'; drop table boete")).toBeNull()
  })
})
