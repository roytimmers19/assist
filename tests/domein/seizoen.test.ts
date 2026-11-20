import { describe, expect, it } from 'vitest'
import { alsSeizoen, leesSeizoen } from '@/lib/weergave/seizoen'

describe('het seizoen in het scherm', () => {
  it('schrijft een seizoen als 26/27', () => {
    expect(alsSeizoen(2026)).toBe('26/27')
    expect(alsSeizoen(2099)).toBe('99/00')
  })

  it('leest een seizoen uit de adresbalk, en valt anders terug op het huidige', () => {
    expect(leesSeizoen('2025', 2026)).toBe(2025)
    expect(leesSeizoen(undefined, 2026)).toBe(2026)
    expect(leesSeizoen('vorig', 2026)).toBe(2026)
    expect(leesSeizoen('1999', 2026)).toBe(2026)
  })
})
