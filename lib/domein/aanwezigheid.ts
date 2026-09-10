import type { Melding, Stand, Status } from './types'

/**
 * De actuele stand is de laatste melding per speler. Zegt hij niets, dan geldt
 * zijn standaard voor dit soort event: meestal ja, maar nee voor wie er
 * structureel niet bij is.
 *
 * Deze functie weet niet wat een training is en hoeft dat ook niet te weten —
 * de standaard komt binnen als gegeven. Zo blijft ze doen wat ze altijd deed:
 * een melding laten winnen van een aanname.
 */
export function actueleStand(
  spelers: { id: string; standaard: Status }[],
  meldingen: Melding[],
): Stand[] {
  const laatste = new Map<string, Melding>()

  for (const melding of meldingen) {
    const huidige = laatste.get(melding.spelerId)
    if (!huidige || melding.gezetOp.getTime() > huidige.gezetOp.getTime()) {
      laatste.set(melding.spelerId, melding)
    }
  }

  return spelers.map((speler) => {
    const gevonden = laatste.get(speler.id)
    if (!gevonden) {
      return {
        spelerId: speler.id,
        status: speler.standaard,
        bron: 'aanname',
        toelichting: null,
        gezetOp: null,
      }
    }
    return {
      spelerId: speler.id,
      status: gevonden.status,
      bron: gevonden.bron,
      toelichting: gevonden.toelichting,
      gezetOp: gevonden.gezetOp,
    }
  })
}
