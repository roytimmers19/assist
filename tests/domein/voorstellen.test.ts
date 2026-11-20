import { describe, expect, it } from 'vitest'
import type { Melding } from '@/lib/domein/types'
import { type VoorstelInvoer, krijgtVoorstel, voorstellen } from '@/lib/domein/voorstellen'

// Zondag 22 november 2026, 14:00 in Nederland. De grens is dinsdag 17
// november 23:59:59, dus 22:59:59 UTC.
const wedstrijd = {
  id: 'w-1',
  type: 'wedstrijd' as const,
  startOp: new Date('2026-11-22T13:00:00Z'),
  status: 'gepland' as const,
}
// Donderdag 19 november 2026, 20:00. Grens woensdag 18 november 23:59:59.
const training = {
  id: 't-1',
  type: 'training' as const,
  startOp: new Date('2026-11-19T19:00:00Z'),
  status: 'gepland' as const,
}

const maandag = new Date('2026-11-16T10:00:00Z')
const woensdag = new Date('2026-11-18T10:00:00Z')
const woensdagLater = new Date('2026-11-18T10:01:00Z')
const woensdagNogLater = new Date('2026-11-18T10:02:00Z')

const koppeling = {
  type: 'wedstrijd' as const,
  soortId: 's-1',
  omschrijving: 'Te laat afgemeld',
  bedragCent: 500,
  gekoppeldOp: new Date('2026-11-01T00:00:00Z'),
}

const komt = { id: 'aap', doetTrainingen: true, doetWedstrijden: true }

function melding(
  status: 'ja' | 'nee',
  gezetOp: Date,
  bron: 'speler' | 'leider' = 'speler',
  spelerId = 'aap',
): Melding {
  return { spelerId, status, bron, toelichting: status === 'nee' ? 'werk' : null, gezetDoor: spelerId, gezetOp }
}

function invoer(meldingen: Melding[], extra: Partial<VoorstelInvoer> = {}): VoorstelInvoer {
  return {
    events: [wedstrijd],
    spelers: [komt],
    meldingen: new Map([[wedstrijd.id, meldingen]]),
    koppelingen: [koppeling],
    afgehandeld: new Set(),
    ...extra,
  }
}

describe('voorstellen bij te laat afmelden', () => {
  it('stelt een boete voor als iemand die kwam zich na de grens zelf afmeldt', () => {
    const uit = voorstellen(invoer([melding('ja', maandag), melding('nee', woensdag)]))

    expect(uit).toEqual([
      {
        eventId: 'w-1',
        spelerId: 'aap',
        soortId: 's-1',
        omschrijving: 'Te laat afgemeld',
        bedragCent: 500,
        afgemeldOp: woensdag,
        reden: 'werk',
      },
    ])
  })

  it('stelt ook een boete voor als iemand standaard kwam en niets had gemeld', () => {
    const uit = voorstellen(invoer([melding('nee', woensdag)]))
    expect(uit).toHaveLength(1)
  })

  it('stelt niets voor als iemand op tijd was afgemeld en per ongeluk wisselde', () => {
    const uit = voorstellen(
      invoer([melding('nee', maandag), melding('ja', woensdag), melding('nee', woensdagLater)]),
    )
    expect(uit).toEqual([])
  })

  it('stelt niets voor als iemand op tijd afgemeld was en later zijn reden aanpaste', () => {
    const uit = voorstellen(invoer([melding('nee', maandag), melding('nee', woensdag)]))
    expect(uit).toEqual([])
  })

  it('stelt niets voor als iemand standaard niet speelt', () => {
    const uit = voorstellen(
      invoer([melding('nee', woensdag)], {
        spelers: [{ id: 'aap', doetTrainingen: true, doetWedstrijden: false }],
      }),
    )
    expect(uit).toEqual([])
  })

  it('laat het voorstel vervallen als iemand zich weer aanmeldt', () => {
    const uit = voorstellen(invoer([melding('nee', woensdag), melding('ja', woensdagLater)]))
    expect(uit).toEqual([])
  })

  it('neemt het moment waarop de afmelding begon, ook als hij daarna zijn reden aanpaste', () => {
    const uit = voorstellen(invoer([melding('nee', woensdag), melding('nee', woensdagNogLater)]))
    expect(uit[0].afgemeldOp).toEqual(woensdag)
  })

  it('stelt ook een boete voor als een leider iemand te laat afmeldde', () => {
    const uit = voorstellen(invoer([melding('ja', maandag), melding('nee', woensdag, 'leider')]))
    expect(uit).toMatchObject([{ spelerId: 'aap', afgemeldOp: woensdag }])
  })

  it('stelt niets voor als een leider iemand al op tijd had afgemeld', () => {
    const uit = voorstellen(invoer([melding('nee', maandag, 'leider'), melding('nee', woensdag)]))
    expect(uit).toEqual([])
  })

  it('stelt niets voor zonder gekoppelde vaste boete voor dat soort event', () => {
    const uit = voorstellen(
      invoer([], {
        events: [training],
        meldingen: new Map([[training.id, [melding('nee', new Date('2026-11-19T10:00:00Z'))]]]),
      }),
    )
    expect(uit).toEqual([])
  })

  it('stelt niets voor over een afmelding van vóór de koppeling', () => {
    const uit = voorstellen(
      invoer([melding('nee', woensdag)], {
        koppelingen: [{ ...koppeling, gekoppeldOp: new Date('2026-11-19T00:00:00Z') }],
      }),
    )
    expect(uit).toEqual([])
  })

  it('stelt niets voor bij een afgelast event', () => {
    const uit = voorstellen(
      invoer([melding('nee', woensdag)], { events: [{ ...wedstrijd, status: 'afgelast' }] }),
    )
    expect(uit).toEqual([])
  })

  it('stelt niets voor als er al een te-laat-boete is, bevestigd of gevallen', () => {
    const uit = voorstellen(
      invoer([melding('nee', woensdag)], { afgehandeld: new Set(['w-1:aap']) }),
    )
    expect(uit).toEqual([])
  })

  it('houdt spelers bij hetzelfde event uit elkaar', () => {
    const uit = voorstellen(
      invoer(
        [
          melding('nee', woensdag, 'speler', 'aap'),
          melding('nee', maandag, 'speler', 'noot'),
        ],
        {
          spelers: [komt, { id: 'noot', doetTrainingen: true, doetWedstrijden: true }],
        },
      ),
    )
    expect(uit.map((v) => v.spelerId)).toEqual(['aap'])
  })
})

describe('krijgtVoorstel: wat er zou gebeuren als een leider nu afmeldt', () => {
  const nu = new Date('2026-11-18T12:00:00Z')

  it('zegt ja als afmelden na de grens een voorstel oplevert', () => {
    expect(krijgtVoorstel(invoer([melding('ja', maandag)]), 'w-1', 'aap', nu)).toMatchObject({
      bedragCent: 500,
    })
  })

  it('zegt nee als hij bij de grens al afgemeld stond', () => {
    expect(krijgtVoorstel(invoer([melding('nee', maandag), melding('ja', woensdag)]), 'w-1', 'aap', nu)).toBeNull()
  })

  it('zegt nee als er al een te-laat-boete is', () => {
    expect(
      krijgtVoorstel(invoer([melding('ja', maandag)], { afgehandeld: new Set(['w-1:aap']) }), 'w-1', 'aap', nu),
    ).toBeNull()
  })

  it('zegt nee zonder gekoppelde vaste boete', () => {
    expect(krijgtVoorstel(invoer([melding('ja', maandag)], { koppelingen: [] }), 'w-1', 'aap', nu)).toBeNull()
  })
})
