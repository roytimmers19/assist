/**
 * Leest de seizoensgegevens uit een databestand in plaats van uit de code.
 * De echte ploeg staat in scripts/seizoen.json — dat bestand staat in
 * .gitignore, want het bevat namen van mensen en de repo is openbaar.
 * scripts/seizoen.voorbeeld.json laat zien welke vorm het bestand heeft.
 */
import { readFileSync } from 'node:fs'
import type { Rijdatum, Seizoen, Weekduo } from '../lib/domein/dienstrooster'

/**
 * De steekproef waarmee tests/domein/seizoen2627.test.ts het afschrift tegen
 * de foto's uit de groepsapp controleert. Verzonnen namen zouden hier niets
 * meer bewijzen, dus staan deze verwachtingen hier in plaats van in de test.
 */
export type Steekproef = {
  duoVanWeek: { week: number; duo: Weekduo }[]
  materiaalZonderRij: string
  nogGeenLid: string
}

export type Seizoensgegevens = {
  seizoen: Seizoen
  materiaalduos: Weekduo[]
  rijdatums: Rijdatum[]
  roepnamen: Record<string, string | null>
  steekproef: Steekproef
}

export const SEIZOENBESTAND = 'scripts/seizoen.json'

export function laadSeizoen(pad: string = SEIZOENBESTAND): Seizoensgegevens {
  let ruw: string
  try {
    ruw = readFileSync(pad, 'utf8')
  } catch {
    throw new Error(
      `${pad} ontbreekt. Kopieer scripts/seizoen.voorbeeld.json ernaartoe en vul de ` +
        'echte ploeg in. Dat bestand staat in .gitignore en hoort niet in de repo.',
    )
  }

  const data = JSON.parse(ruw) as Partial<Seizoensgegevens>

  if (!data.seizoen?.van || !data.seizoen?.tot) {
    throw new Error(`${pad}: "seizoen" mist "van" of "tot".`)
  }
  if (!Array.isArray(data.materiaalduos) || data.materiaalduos.some((d) => d?.length !== 2)) {
    throw new Error(`${pad}: "materiaalduos" moet een lijst van paren zijn.`)
  }
  if (!Array.isArray(data.rijdatums) || data.rijdatums.some((r) => !r?.datum || !Array.isArray(r.rijders))) {
    throw new Error(`${pad}: elke rijdatum heeft een "datum" en een lijst "rijders".`)
  }
  if (!data.roepnamen || typeof data.roepnamen !== 'object') {
    throw new Error(`${pad}: "roepnamen" ontbreekt.`)
  }
  if (
    !Array.isArray(data.steekproef?.duoVanWeek) ||
    data.steekproef.duoVanWeek.some((d) => typeof d?.week !== 'number' || d?.duo?.length !== 2)
  ) {
    throw new Error(`${pad}: "steekproef.duoVanWeek" moet een lijst van week/duo-paren zijn.`)
  }
  if (typeof data.steekproef?.materiaalZonderRij !== 'string') {
    throw new Error(`${pad}: "steekproef.materiaalZonderRij" ontbreekt.`)
  }
  if (typeof data.steekproef?.nogGeenLid !== 'string') {
    throw new Error(`${pad}: "steekproef.nogGeenLid" ontbreekt.`)
  }

  return {
    seizoen: data.seizoen,
    materiaalduos: data.materiaalduos,
    rijdatums: data.rijdatums,
    roepnamen: data.roepnamen,
    steekproef: data.steekproef,
  }
}
