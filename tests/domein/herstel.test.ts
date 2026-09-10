import { describe, expect, it } from 'vitest'
import { biedHerstellinkAan, vangHerstellink } from '@/lib/auth/herstel'

const pauze = (ms: number) => new Promise((klaar) => setTimeout(klaar, ms))

describe('een herstellink opvangen in plaats van versturen', () => {
  it('geeft de link terug aan wie erom vroeg', async () => {
    const link = await vangHerstellink(async () => {
      biedHerstellinkAan('http://voorbeeld.test/herstel/aap')
    })

    expect(link).toBe('http://voorbeeld.test/herstel/aap')
  })

  it('meldt buiten een opvang dat er niemand klaarstaat', () => {
    expect(biedHerstellinkAan('http://voorbeeld.test/herstel/noot')).toBe(false)
  })

  it('geeft niets terug als er geen link werd aangeboden', async () => {
    expect(await vangHerstellink(async () => {})).toBeNull()
  })

  it('houdt twee aanvragen die door elkaar lopen uit elkaar', async () => {
    const [vanMies, vanWim] = await Promise.all([
      vangHerstellink(async () => {
        await pauze(20)
        biedHerstellinkAan('http://voorbeeld.test/herstel/mies')
      }),
      vangHerstellink(async () => {
        biedHerstellinkAan('http://voorbeeld.test/herstel/wim')
      }),
    ])

    expect(vanMies).toBe('http://voorbeeld.test/herstel/mies')
    expect(vanWim).toBe('http://voorbeeld.test/herstel/wim')
  })
})
