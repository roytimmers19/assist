import { describe, expect, it } from 'vitest'
import { deurStaatOpen } from '@/lib/domein/toelating'

const NU = new Date('2026-09-01T20:00:00Z')

describe('deurStaatOpen', () => {
  it('is dicht als er geen tijdstip staat', () => {
    expect(deurStaatOpen(null, NU)).toBe(false)
  })

  it('is open zolang het tijdstip nog niet bereikt is', () => {
    expect(deurStaatOpen(new Date('2026-09-02T20:00:00Z'), NU)).toBe(true)
  })

  it('is dicht zodra het tijdstip voorbij is', () => {
    expect(deurStaatOpen(new Date('2026-09-01T19:59:59Z'), NU)).toBe(false)
  })

  // Precies óp de vervaltijd is hij dicht. Een deur die op zijn eigen sluitmoment
  // nog openstaat laat er net één binnen die je niet verwachtte.
  it('is dicht precies op de vervaltijd', () => {
    expect(deurStaatOpen(new Date('2026-09-01T20:00:00Z'), NU)).toBe(false)
  })
})
