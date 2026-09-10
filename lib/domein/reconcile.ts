import { DateTime } from 'luxon'
import { ZONE } from './tijd'
import type { BestaandEvent, GeparsedEvent, ImportPlan, Noodrem } from './types'

/** ISO-jaar plus weeknummer, bijvoorbeeld "2026-W36". */
function weeksleutel(moment: Date): string {
  const dt = DateTime.fromJSDate(moment).setZone(ZONE)
  return `${dt.weekYear}-W${String(dt.weekNumber).padStart(2, '0')}`
}

/**
 * Koppelt de feed aan wat er al staat.
 *
 * Wedstrijden dragen een stabiel Sportlink-nummer en worden op UID gekoppeld.
 * Trainingen dragen een UID die uit hun aanvangstijd is afgeleid, dus die
 * verandert zodra de training verschuift. Daarom worden overgebleven trainingen
 * per ISO-week gekoppeld: precies één binnengekomen tegenover precies één
 * bestaande in dezelfde week is dezelfde training, verplaatst.
 */
export function maakImportPlan(
  bestaand: BestaandEvent[],
  binnengekomen: GeparsedEvent[],
  nu: Date,
): ImportPlan {
  const nieuw: GeparsedEvent[] = []
  const bijwerken: { id: string; event: GeparsedEvent }[] = []

  const opUid = new Map<string, BestaandEvent>()
  for (const e of bestaand) if (e.icalUid) opUid.set(e.icalUid, e)

  const geclaimd = new Set<string>()
  const restBinnen: GeparsedEvent[] = []

  // Stap 1 — koppelen op UID.
  for (const binnen of binnengekomen) {
    const gevonden = opUid.get(binnen.icalUid)
    if (gevonden) {
      bijwerken.push({ id: gevonden.id, event: binnen })
      geclaimd.add(gevonden.id)
    } else {
      restBinnen.push(binnen)
    }
  }

  // Stap 2 — overgebleven trainingen koppelen per ISO-week.
  const vrijeBestaandeTrainingen = bestaand.filter(
    (e) => e.type === 'training' && !geclaimd.has(e.id) && e.status === 'gepland',
  )

  const binnenPerWeek = new Map<string, GeparsedEvent[]>()
  for (const binnen of restBinnen) {
    if (binnen.type !== 'training') continue
    const sleutel = weeksleutel(binnen.startOp)
    const lijst = binnenPerWeek.get(sleutel) ?? []
    lijst.push(binnen)
    binnenPerWeek.set(sleutel, lijst)
  }

  const bestaandPerWeek = new Map<string, BestaandEvent[]>()
  for (const e of vrijeBestaandeTrainingen) {
    const sleutel = weeksleutel(e.startOp)
    const lijst = bestaandPerWeek.get(sleutel) ?? []
    lijst.push(e)
    bestaandPerWeek.set(sleutel, lijst)
  }

  const gekoppeldeBinnen = new Set<GeparsedEvent>()
  for (const [sleutel, binnenLijst] of binnenPerWeek) {
    const bestaandLijst = bestaandPerWeek.get(sleutel) ?? []
    if (binnenLijst.length === 1 && bestaandLijst.length === 1) {
      bijwerken.push({ id: bestaandLijst[0].id, event: binnenLijst[0] })
      geclaimd.add(bestaandLijst[0].id)
      gekoppeldeBinnen.add(binnenLijst[0])
    }
  }

  // Stap 3 — wat overblijft is nieuw.
  for (const binnen of restBinnen) {
    if (!gekoppeldeBinnen.has(binnen)) nieuw.push(binnen)
  }

  // Stap 4 — toekomstige, geplande events die niemand claimde, worden afgelast.
  const afgelasten = bestaand
    .filter((e) => !geclaimd.has(e.id) && e.status === 'gepland' && e.startOp.getTime() > nu.getTime())
    .map((e) => ({ id: e.id }))

  return { nieuw, bijwerken, afgelasten }
}

/**
 * Beoordeelt of een plan geloofwaardig is. Een plan dat het halve seizoen wil
 * afgelasten betekent nooit dat er een half seizoen is afgelast; het betekent
 * dat de bron plat lag of van vorm veranderde.
 */
export function beoordeelNoodrem(plan: ImportPlan, bestaand: BestaandEvent[], nu: Date): Noodrem {
  const toekomstig = bestaand.filter(
    (e) => e.status === 'gepland' && e.startOp.getTime() > nu.getTime(),
  ).length

  if (toekomstig === 0) return { rem: false }

  if (plan.afgelasten.length * 2 > toekomstig) {
    return {
      rem: true,
      reden: `Afgebroken: dit plan zou ${plan.afgelasten.length} van de ${toekomstig} toekomstige events afgelasten.`,
    }
  }

  return { rem: false }
}
