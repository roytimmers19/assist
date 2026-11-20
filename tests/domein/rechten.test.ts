import { describe, expect, it } from 'vitest'
import { magAfrekenen, magBoetesGeven, magLeiden } from '@/lib/domein/rechten'

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

describe('de rechten in de boetepot', () => {
  const mies = { rol: 'leider' as const, beheerder: false, penningmeester: false, boeteUitdeler: false }
  const aap = { rol: 'speler' as const, beheerder: false, penningmeester: false, boeteUitdeler: true }
  const noot = { rol: 'speler' as const, beheerder: false, penningmeester: true, boeteUitdeler: false }
  const wim = { rol: 'speler' as const, beheerder: false, penningmeester: false, boeteUitdeler: false }
  const beheerder = { rol: 'speler' as const, beheerder: true, penningmeester: false, boeteUitdeler: false }

  it('laat een leider boetes geven en afrekenen', () => {
    expect(magBoetesGeven(mies)).toBe(true)
    expect(magAfrekenen(mies)).toBe(true)
  })

  it('laat een beheerder boetes geven en afrekenen', () => {
    expect(magBoetesGeven(beheerder)).toBe(true)
    expect(magAfrekenen(beheerder)).toBe(true)
  })

  it('laat een boete-uitdeler boetes geven, maar niet afrekenen', () => {
    expect(magBoetesGeven(aap)).toBe(true)
    expect(magAfrekenen(aap)).toBe(false)
  })

  it('laat een penningmeester boetes geven en afrekenen', () => {
    expect(magBoetesGeven(noot)).toBe(true)
    expect(magAfrekenen(noot)).toBe(true)
  })

  it('laat een gewone speler geen van beide', () => {
    expect(magBoetesGeven(wim)).toBe(false)
    expect(magAfrekenen(wim)).toBe(false)
  })

  it('maakt van een penningmeester of boete-uitdeler geen leider', () => {
    expect(magLeiden(noot)).toBe(false)
    expect(magLeiden(aap)).toBe(false)
  })
})
