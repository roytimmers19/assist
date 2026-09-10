import { describe, expect, it } from 'vitest'
import { actueleStand } from '@/lib/domein/aanwezigheid'
import type { Melding } from '@/lib/domein/types'

const melding = (
  spelerId: string,
  status: 'ja' | 'nee',
  bron: 'speler' | 'leider',
  gezetOp: string,
  toelichting: string | null = null,
): Melding => ({ spelerId, status, bron, toelichting, gezetOp: new Date(gezetOp) })

describe('actueleStand', () => {
  it('zet een speler zonder enige melding op ja met bron aanname', () => {
    const stand = actueleStand([{ id: 'bas', standaard: 'ja' }], [])
    expect(stand).toEqual([
      { spelerId: 'bas', status: 'ja', bron: 'aanname', toelichting: null, gezetOp: null },
    ])
  })

  it('neemt de laatste melding uit een reeks van vijf', () => {
    const meldingen = [
      melding('bas', 'nee', 'speler', '2026-09-04T21:14:00Z', 'rug'),
      melding('bas', 'ja', 'speler', '2026-09-05T09:02:00Z'),
      melding('bas', 'nee', 'speler', '2026-09-05T18:00:00Z', 'toch niet'),
      melding('bas', 'ja', 'speler', '2026-09-06T07:00:00Z'),
      melding('bas', 'nee', 'leider', '2026-09-06T08:40:00Z', 'ziek gemeld via mij'),
    ]
    expect(actueleStand([{ id: 'bas', standaard: 'ja' }], meldingen)).toEqual([
      {
        spelerId: 'bas',
        status: 'nee',
        bron: 'leider',
        toelichting: 'ziek gemeld via mij',
        gezetOp: new Date('2026-09-06T08:40:00Z'),
      },
    ])
  })

  it('is niet afhankelijk van de volgorde waarin de meldingen binnenkomen', () => {
    const meldingen = [
      melding('bas', 'ja', 'speler', '2026-09-06T07:00:00Z'),
      melding('bas', 'nee', 'speler', '2026-09-04T21:14:00Z', 'rug'),
    ]
    expect(actueleStand([{ id: 'bas', standaard: 'ja' }], meldingen)[0].status).toBe('ja')
  })

  it('houdt spelers uit elkaar en bewaart de meegegeven volgorde', () => {
    const meldingen = [melding('kes', 'nee', 'speler', '2026-09-05T10:00:00Z', 'werk')]
    const stand = actueleStand([{ id: 'bas', standaard: 'ja' }, { id: 'kes', standaard: 'ja' }], meldingen)
    expect(stand.map((s) => s.spelerId)).toEqual(['bas', 'kes'])
    expect(stand[0].bron).toBe('aanname')
    expect(stand[1]).toMatchObject({ status: 'nee', bron: 'speler', toelichting: 'werk' })
  })

  it('negeert meldingen van spelers die niet in de lijst staan', () => {
    const meldingen = [melding('onbekend', 'nee', 'speler', '2026-09-05T10:00:00Z')]
    expect(actueleStand([{ id: 'bas', standaard: 'ja' }], meldingen)).toHaveLength(1)
  })
})

describe('actueleStand met een standaard', () => {
  // De combinatie die tot nu toe niet bestond, want de aanname was altijd ja.
  it('zet wie structureel niet meedoet op nee met bron aanname', () => {
    const stand = actueleStand([{ id: 'bas', standaard: 'nee' }], [])
    expect(stand).toEqual([
      { spelerId: 'bas', status: 'nee', bron: 'aanname', toelichting: null, gezetOp: null },
    ])
  })

  // Een standaard is geen slot: wie nooit traint maar een keer wél kan, meldt
  // zich voor die ene training aan.
  it('laat een melding winnen van de standaard nee', () => {
    const stand = actueleStand(
      [{ id: 'bas', standaard: 'nee' }],
      [melding('bas', 'ja', 'speler', '2026-09-01T10:00:00Z')],
    )
    expect(stand[0]).toMatchObject({ status: 'ja', bron: 'speler' })
  })

  it('laat een melding ook winnen van de standaard ja', () => {
    const stand = actueleStand(
      [{ id: 'bas', standaard: 'ja' }],
      [melding('bas', 'nee', 'speler', '2026-09-01T10:00:00Z')],
    )
    expect(stand[0]).toMatchObject({ status: 'nee', bron: 'speler' })
  })

  it('houdt per speler zijn eigen standaard aan', () => {
    const stand = actueleStand(
      [
        { id: 'bas', standaard: 'nee' },
        { id: 'kes', standaard: 'ja' },
      ],
      [],
    )
    expect(stand.map((s) => s.status)).toEqual(['nee', 'ja'])
  })

  it('geeft een lege lijst terug zonder spelers', () => {
    expect(actueleStand([], [])).toEqual([])
  })
})
