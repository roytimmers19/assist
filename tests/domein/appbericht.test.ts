import { describe, expect, it } from 'vitest'
import { maakAppBericht } from '@/lib/domein/appbericht'

describe('maakAppBericht', () => {
  it('noemt de stille spelers bij naam', () => {
    const bericht = maakAppBericht({
      titel: 'Thuis tegen Tegenstander 1 (zon)',
      wanneer: 'Zondag 30 augustus, 10:00',
      deadline: 'vrijdag 28 augustus, 10:00',
      stilleNamen: ['Bas', 'Kes', 'Youri'],
    })
    expect(bericht).toContain('Bas, Kes en Youri')
    expect(bericht).toContain('Thuis tegen Tegenstander 1 (zon)')
    expect(bericht).toContain('vrijdag 28 augustus, 10:00')
  })

  it('gebruikt geen komma bij twee namen', () => {
    const bericht = maakAppBericht({
      titel: 'Training',
      wanneer: 'Donderdag 3 september, 18:30',
      deadline: 'woensdag 2 september, 18:30',
      stilleNamen: ['Bas', 'Kes'],
    })
    expect(bericht).toContain('Bas en Kes')
    expect(bericht).not.toContain('Bas, Kes')
  })

  it('meldt netjes dat iedereen gereageerd heeft', () => {
    const bericht = maakAppBericht({
      titel: 'Training',
      wanneer: 'Donderdag 3 september, 18:30',
      deadline: 'woensdag 2 september, 18:30',
      stilleNamen: [],
    })
    expect(bericht).toBe('Iedereen heeft al gereageerd.')
  })
})
