import { describe, expect, it } from 'vitest'
import { alsTekst, alsTekstOfNiets, alsVinkje } from '@/lib/weergave/formulier'

/**
 * Een formulier zoals een browser het opstuurt: een aangevinkt vakje levert
 * zijn `value`, een uitgevinkt vakje stuurt helemaal niets mee.
 */
function metVelden(velden: [string, string][]): FormData {
  const formulier = new FormData()
  for (const [sleutel, waarde] of velden) formulier.append(sleutel, waarde)
  return formulier
}

describe('alsVinkje', () => {
  it('is aan als het vakje is aangevinkt', () => {
    expect(alsVinkje(metVelden([['doetTrainingen', 'ja']]), 'doetTrainingen')).toBe(true)
  })

  // Dit is het geval dat stilletjes fout gaat: er komt niets binnen, en alles
  // wat niet exact 'ja' is moet uit betekenen.
  it('is uit als het vakje ontbreekt', () => {
    expect(alsVinkje(metVelden([]), 'doetTrainingen')).toBe(false)
  })

  it('is uit bij een andere waarde dan ja', () => {
    for (const waarde of ['on', 'true', '1']) {
      expect(alsVinkje(metVelden([['doetTrainingen', waarde]]), 'doetTrainingen')).toBe(false)
    }
  })

  // Een formulier met twee vakjes waarvan er één uit staat: het aangevinkte
  // vakje mag het uitgevinkte niet meetrekken.
  it('leest twee vakjes los van elkaar', () => {
    const formulier = metVelden([['doetWedstrijden', 'ja']])
    expect(alsVinkje(formulier, 'doetTrainingen')).toBe(false)
    expect(alsVinkje(formulier, 'doetWedstrijden')).toBe(true)
  })
})

describe('alsTekst', () => {
  it('geeft de waarde als tekst', () => {
    const formulier = new FormData()
    formulier.set('eventId', 'evt-1')
    expect(alsTekst(formulier, 'eventId')).toBe('evt-1')
  })

  it('geeft lege tekst als het veld ontbreekt', () => {
    expect(alsTekst(new FormData(), 'eventId')).toBe('')
  })

  // Bewust niet trimmen: dat is een keuze van de aanroeper, en een id hoort
  // ongemoeid te blijven.
  it('laat spaties staan', () => {
    const formulier = new FormData()
    formulier.set('naam', ' Jan ')
    expect(alsTekst(formulier, 'naam')).toBe(' Jan ')
  })
})

describe('alsTekstOfNiets', () => {
  it('geeft de getrimde waarde', () => {
    const formulier = new FormData()
    formulier.set('toelichting', '  ziek  ')
    expect(alsTekstOfNiets(formulier, 'toelichting')).toBe('ziek')
  })

  // Alleen spaties is niets ingevuld. Zou hier een lege tekst uit komen, dan
  // zou de database het verschil moeten kennen tussen leeg en niets.
  it('geeft niets bij een veld met alleen spaties', () => {
    const formulier = new FormData()
    formulier.set('toelichting', '   ')
    expect(alsTekstOfNiets(formulier, 'toelichting')).toBeNull()
  })

  it('geeft niets als het veld ontbreekt', () => {
    expect(alsTekstOfNiets(new FormData(), 'toelichting')).toBeNull()
  })
})
