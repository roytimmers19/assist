import { describe, expect, it } from 'vitest'
import { planOverstap } from '@/lib/domein/overstap'

const spelers = [
  { id: 'id-aap', email: 'aap@voorbeeld.nl' },
  { id: 'id-noot', email: 'noot@voorbeeld.nl' },
]

const koppeling = { 'Aap A.': 'aap@voorbeeld.nl', Noot: 'NOOT@voorbeeld.nl' }

describe('planOverstap', () => {
  it('zet elke boete om naar een rij met wie, waarvoor, bedrag, datum en of hij betaald is', () => {
    const plan = planOverstap(
      {
        spelers: koppeling,
        boetes: [
          { speler: 'Aap A.', omschrijving: 'Gele kaart', bedrag: '5,00', datum: '2026-09-13', betaald: true },
          { speler: 'Noot', omschrijving: 'Te laat', bedrag: '2', datum: '2026-10-01', betaald: false },
        ],
      },
      spelers,
    )

    expect(plan).toEqual({
      rijen: [
        { spelerId: 'id-aap', omschrijving: 'Gele kaart', bedragCent: 500, datum: '2026-09-13', betaald: true },
        { spelerId: 'id-noot', omschrijving: 'Te laat', bedragCent: 200, datum: '2026-10-01', betaald: false },
      ],
    })
  })

  it('noemt elke naam die bij geen speler hoort, en schrijft dan niets', () => {
    const plan = planOverstap(
      {
        spelers: { ...koppeling, Wim: 'wim@voorbeeld.nl' },
        boetes: [
          { speler: 'Mies', omschrijving: 'Gele kaart', bedrag: '5', datum: '2026-09-13', betaald: false },
          { speler: 'Wim', omschrijving: 'Gele kaart', bedrag: '5', datum: '2026-09-13', betaald: false },
          { speler: 'Mies', omschrijving: 'Rode kaart', bedrag: '15', datum: '2026-09-20', betaald: false },
        ],
      },
      spelers,
    )

    expect(plan).toEqual({ fouten: ['Onbekende naam: Mies', 'Onbekende naam: Wim'] })
  })

  it('weigert een bedrag of datum die niet te lezen is, met het regelnummer erbij', () => {
    const plan = planOverstap(
      {
        spelers: koppeling,
        boetes: [
          { speler: 'Noot', omschrijving: 'Te laat', bedrag: 'twee', datum: '2026-10-01', betaald: false },
          { speler: 'Noot', omschrijving: 'Te laat', bedrag: '2', datum: '1 oktober', betaald: false },
          { speler: 'Noot', omschrijving: ' ', bedrag: '2', datum: '2026-10-01', betaald: false },
        ],
      },
      spelers,
    )

    expect(plan).toEqual({
      fouten: [
        'Boete 1: bedrag "twee" is geen bedrag',
        'Boete 2: datum "1 oktober" is geen datum als 2026-10-01',
        'Boete 3: omschrijving ontbreekt',
      ],
    })
  })
})
