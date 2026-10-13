import { describe, expect, it } from 'vitest'
import { magLeiden } from '@/lib/domein/rechten'

describe('magLeiden', () => {
  it('laat een leider leiden', () => {
    expect(magLeiden({ rol: 'leider', beheerder: false })).toBe(true)
  })

  it('laat een beheerder met de rol speler leiden', () => {
    expect(magLeiden({ rol: 'speler', beheerder: true })).toBe(true)
  })

  it('laat een leider die ook beheerder is leiden', () => {
    expect(magLeiden({ rol: 'leider', beheerder: true })).toBe(true)
  })

  it('houdt een speler zonder het recht buiten', () => {
    expect(magLeiden({ rol: 'speler', beheerder: false })).toBe(false)
  })
})
