import { describe, expect, it } from 'vitest'
import { doetMee, standaardVoor } from '@/lib/domein/beschikbaarheid'

const alles = { doetTrainingen: true, doetWedstrijden: true }
const werktDonderdag = { doetTrainingen: false, doetWedstrijden: true }
const leiderDieNietSpeelt = { doetTrainingen: false, doetWedstrijden: false }

describe('doetMee', () => {
  it('leest voor een training het trainingsveld', () => {
    expect(doetMee(werktDonderdag, 'training')).toBe(false)
    expect(doetMee(werktDonderdag, 'wedstrijd')).toBe(true)
  })

  // Andersom aansluiten is de fout die je nergens meer ziet: alles blijft
  // werken, alleen precies verkeerd om.
  it('leest voor een wedstrijd het wedstrijdveld', () => {
    const speeltNiet = { doetTrainingen: true, doetWedstrijden: false }
    expect(doetMee(speeltNiet, 'wedstrijd')).toBe(false)
    expect(doetMee(speeltNiet, 'training')).toBe(true)
  })

  it('doet overal mee als beide aan staan', () => {
    expect(doetMee(alles, 'training')).toBe(true)
    expect(doetMee(alles, 'wedstrijd')).toBe(true)
  })

  it('doet nergens mee als beide uit staan', () => {
    expect(doetMee(leiderDieNietSpeelt, 'training')).toBe(false)
    expect(doetMee(leiderDieNietSpeelt, 'wedstrijd')).toBe(false)
  })
})

describe('standaardVoor', () => {
  it('geeft ja voor wie meedoet en nee voor wie niet meedoet', () => {
    expect(standaardVoor(alles, 'training')).toBe('ja')
    expect(standaardVoor(werktDonderdag, 'training')).toBe('nee')
  })
})
