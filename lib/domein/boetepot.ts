import { DateTime } from 'luxon'
import { ZONE } from './tijd'

/** Een boete zoals de rekenregels hem nodig hebben. */
export type Boete = {
  id: string
  spelerId: string
  omschrijving: string
  bedragCent: number
  /** `YYYY-MM-DD`: de dag waar de boete over gaat. */
  datum: string
  eventId: string | null
  status: 'telt' | 'gevallen'
  gegevenOp: Date
  ingetrokkenOp: Date | null
  betaaldOp: Date | null
}

type Speler = { id: string; naam: string }

export type Plek = {
  spelerId: string
  naam: string
  totaalCent: number
  /** Bij een gelijk bedrag delen spelers een plek: 1, 1, 3. */
  plek: number
  uitgelicht: boolean
}

const ZEVEN_DAGEN = 7 * 24 * 60 * 60 * 1000

/** Een seizoen heet naar het jaar waarin het op 1 juli begint. */
export function seizoenVan(datum: string): number {
  const [jaar, maand] = datum.split('-').map(Number)
  return maand >= 7 ? jaar : jaar - 1
}

export function huidigSeizoen(nu: Date): number {
  return seizoenVan(DateTime.fromJSDate(nu).setZone(ZONE).toISODate()!)
}

/** Een ingetrokken boete en een voorstel dat iemand liet vallen, tellen nergens mee. */
export function telt(boete: Boete): boolean {
  return boete.status === 'telt' && boete.ingetrokkenOp === null
}

function opNaam(a: { naam: string }, b: { naam: string }): number {
  return a.naam.localeCompare(b.naam, 'nl')
}

/**
 * De ranglijst van één seizoen: wie het meest aan boetes kreeg bovenaan,
 * betaald of niet. Wie nog niets heeft staat er niet tussen maar onder
 * "nog schoon", want drie man op een gedeelde laatste plek zegt niets.
 */
export function ranglijst(
  boetes: Boete[],
  spelers: Speler[],
  seizoen: number,
): { plekken: Plek[]; schoon: string[] } {
  const totaal = new Map<string, number>()
  for (const boete of boetes) {
    if (!telt(boete) || seizoenVan(boete.datum) !== seizoen) continue
    totaal.set(boete.spelerId, (totaal.get(boete.spelerId) ?? 0) + boete.bedragCent)
  }

  const metBoete = spelers
    .filter((s) => (totaal.get(s.id) ?? 0) > 0)
    .map((s) => ({ spelerId: s.id, naam: s.naam, totaalCent: totaal.get(s.id)! }))
    .sort((a, b) => b.totaalCent - a.totaalCent || opNaam(a, b))

  const plekken = metBoete.map((rij) => {
    const eerste = metBoete.findIndex((r) => r.totaalCent === rij.totaalCent)
    const plek = eerste + 1
    return { ...rij, plek, uitgelicht: plek <= 3 }
  })

  const schoon = spelers
    .filter((s) => !totaal.has(s.id))
    .sort(opNaam)
    .map((s) => s.naam)

  return { plekken, schoon }
}

/** Alles wat in een seizoen aan boetes is gegeven, betaald of niet. */
export function potCent(boetes: Boete[], seizoen: number): number {
  return boetes
    .filter((b) => telt(b) && seizoenVan(b.datum) === seizoen)
    .reduce((som, b) => som + b.bedragCent, 0)
}

/** Wat één speler in een seizoen aan boetes kreeg, betaald of niet: zijn regel in de ranglijst. */
export function totaalVan(spelerId: string, boetes: Boete[], seizoen: number): number {
  return potCent(
    boetes.filter((b) => b.spelerId === spelerId),
    seizoen,
  )
}

/** Wat een speler nog moet betalen, over alle seizoenen. */
export function openstaandCent(spelerId: string, boetes: Boete[]): number {
  return boetes
    .filter((b) => b.spelerId === spelerId && telt(b) && b.betaaldOp === null)
    .reduce((som, b) => som + b.bedragCent, 0)
}

/**
 * Voor de penningmeester: wie nog iets open heeft, het hoogste bedrag eerst,
 * en wie alles betaald heeft, met het moment van de laatste keer afvinken.
 * Wie nog nooit een boete had, staat in geen van beide.
 */
export function afrekenlijst(
  boetes: Boete[],
  spelers: Speler[],
): {
  open: { spelerId: string; naam: string; openCent: number }[]
  afgerekend: { spelerId: string; naam: string; laatstBetaaldOp: Date }[]
} {
  const open: { spelerId: string; naam: string; openCent: number }[] = []
  const afgerekend: { spelerId: string; naam: string; laatstBetaaldOp: Date }[] = []

  for (const speler of spelers) {
    const eigen = boetes.filter((b) => b.spelerId === speler.id && telt(b))
    if (eigen.length === 0) continue

    const openCent = openstaandCent(speler.id, eigen)
    if (openCent > 0) {
      open.push({ spelerId: speler.id, naam: speler.naam, openCent })
      continue
    }

    const laatstBetaaldOp = eigen
      .map((b) => b.betaaldOp!)
      .reduce((laatste, op) => (op > laatste ? op : laatste))
    afgerekend.push({ spelerId: speler.id, naam: speler.naam, laatstBetaaldOp })
  }

  open.sort((a, b) => b.openCent - a.openCent || opNaam(a, b))
  afgerekend.sort(opNaam)
  return { open, afgerekend }
}

/** De boetes die een speler de afgelopen zeven dagen kreeg, voor zijn beginscherm. */
export function nieuweBoetes(spelerId: string, boetes: Boete[], nu: Date): Boete[] {
  return boetes.filter(
    (b) =>
      b.spelerId === spelerId &&
      telt(b) &&
      nu.getTime() - b.gegevenOp.getTime() < ZEVEN_DAGEN,
  )
}
