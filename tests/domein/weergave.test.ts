import { describe, expect, it } from 'vitest'
import { eventTitel, schoonTegenstander, zonderDagsoort } from '@/lib/weergave/namen'
import { alsDagZonderTijd, alsKortMoment, alsKorteDag, alsTijd } from '@/lib/weergave/tijd'

describe('schoonTegenstander', () => {
  it('haalt de dagsoort uit de naam die de bond meelevert', () => {
    expect(schoonTegenstander('Tegenstander 1 (zon)')).toBe('Tegenstander 1')
    expect(schoonTegenstander('Tegenstander 2 (zon)')).toBe('Tegenstander 2')
    expect(schoonTegenstander('Tegenstander 14 (zat)')).toBe('Tegenstander 14')
  })

  it('laat een naam zonder achtervoegsel met rust', () => {
    expect(schoonTegenstander('Tegenstander 15')).toBe('Tegenstander 15')
  })

  it('laat haakjes staan die geen dagsoort zijn', () => {
    expect(schoonTegenstander('Tegenstander 13 (vr) 1')).toBe('Tegenstander 13 (vr) 1')
  })

  it('geeft een leesbare tekst als de tegenstander ontbreekt', () => {
    expect(schoonTegenstander(null)).toBe('onbekende tegenstander')
  })
})

describe('zonderDagsoort', () => {
  it('werkt ook op de eigen teamnaam', () => {
    expect(zonderDagsoort('SV Voorbeeld 2 (zon)')).toBe('SV Voorbeeld 2')
  })
})

describe('eventTitel', () => {
  it('noemt een training bij naam', () => {
    expect(eventTitel({ type: 'training', thuis: null, tegenstander: null })).toBe('Training')
  })

  it('zet thuis en uit voorop', () => {
    expect(eventTitel({ type: 'wedstrijd', thuis: true, tegenstander: 'Tegenstander 1 (zon)' })).toBe(
      'Thuis tegen Tegenstander 1',
    )
    expect(eventTitel({ type: 'wedstrijd', thuis: false, tegenstander: 'Tegenstander 15' })).toBe(
      'Uit tegen Tegenstander 15',
    )
  })
})

describe('korte tijdweergave', () => {
  it('geeft een compacte dag voor lijstjes', () => {
    expect(alsKorteDag(new Date('2026-08-30T08:00:00Z'))).toBe('zo 30 aug')
  })

  it('geeft de wandklok in Amsterdam, niet UTC', () => {
    expect(alsTijd(new Date('2026-08-30T08:00:00Z'))).toBe('10:00')
  })

  it('noemt de dag voluit zonder tijd, voor lopende tekst', () => {
    expect(alsDagZonderTijd(new Date('2026-09-02T12:00:00Z'))).toBe('woensdag 2 september')
  })

  it('zet dag en tijd samen voor een afmelding', () => {
    // De leider moet kunnen zien of iemand zich op tijd afmeldde; alleen de
    // dag is daarvoor te grof.
    expect(alsKortMoment(new Date('2026-08-29T12:12:00Z'))).toBe('za 29 aug 14:12')
  })
})
