import { describe, expect, it } from 'vitest'
import { alsCenten, alsEuro } from '@/lib/weergave/geld'

describe('alsCenten', () => {
  it('leest hele euro’s en bedragen met een komma of een punt', () => {
    expect(alsCenten('2')).toBe(200)
    expect(alsCenten('1,50')).toBe(150)
    expect(alsCenten('1.50')).toBe(150)
    expect(alsCenten('1,5')).toBe(150)
  })

  it('laat een euroteken en spaties toe', () => {
    expect(alsCenten('€ 2,00')).toBe(200)
    expect(alsCenten('€2')).toBe(200)
    expect(alsCenten(' 12,25 ')).toBe(1225)
  })

  it('weigert leeg, nul, negatief en meer dan twee decimalen', () => {
    expect(alsCenten('')).toBeNull()
    expect(alsCenten('0')).toBeNull()
    expect(alsCenten('0,00')).toBeNull()
    expect(alsCenten('-2')).toBeNull()
    expect(alsCenten('1,505')).toBeNull()
    expect(alsCenten('twee')).toBeNull()
    expect(alsCenten('1,2,3')).toBeNull()
  })
})

describe('alsEuro', () => {
  it('schrijft een bedrag op de Nederlandse manier', () => {
    expect(alsEuro(150)).toBe('€ 1,50')
    expect(alsEuro(1200)).toBe('€ 12,00')
    expect(alsEuro(14950)).toBe('€ 149,50')
    expect(alsEuro(0)).toBe('€ 0,00')
  })
})
