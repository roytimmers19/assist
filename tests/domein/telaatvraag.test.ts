import { describe, expect, it } from 'vitest'
import { teLaatVraag } from '@/lib/weergave/telaatvraag'

describe('de vraag aan de leider na de afmeldgrens', () => {
  it('vraagt bij afmelden om bevestiging en noemt het boetevoorstel', () => {
    expect(teLaatVraag({ naam: 'aap', naar: 'nee', voorstelCent: 1000 })).toBe(
      'De afmeldtermijn is voorbij. aap toch afmelden? Er komt een boetevoorstel van € 10,00 om goed te keuren.',
    )
  })

  it('noemt geen voorstel als er geen vaste boete aan te laat afmelden hangt', () => {
    expect(teLaatVraag({ naam: 'aap', naar: 'nee', voorstelCent: null })).toBe(
      'De afmeldtermijn is voorbij. aap toch afmelden?',
    )
  })

  it('vraagt bij weer aanmelden ook om bevestiging, en noemt een openstaand voorstel', () => {
    expect(teLaatVraag({ naam: 'noot', naar: 'ja', voorstelCent: 1000 })).toBe(
      'De afmeldtermijn is voorbij. noot toch weer aanmelden? Zijn openstaande boetevoorstel vervalt dan.',
    )
    expect(teLaatVraag({ naam: 'noot', naar: 'ja', voorstelCent: null })).toBe(
      'De afmeldtermijn is voorbij. noot toch weer aanmelden?',
    )
  })
})
