import { describe, expect, it } from 'vitest'
import { leesBoeteKeuze } from '@/lib/weergave/boeteformulier'

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
