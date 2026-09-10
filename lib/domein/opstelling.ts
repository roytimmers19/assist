import type { Stand } from './types'

export type OpgesteldePlek = {
  /** Leeg betekent bank; dat komt alleen bij gasten voor. */
  slot: number | null
  spelerId: string | null
  gastnaam: string | null
  gastnummer: number | null
}

export type Bankregel =
  | { spelerId: string; gastnaam: null; gastnummer: null }
  // gastnummer staat ook op de spelersvariant, zodat een lezer van deze lijst
  // er altijd bij kan zonder eerst te hoeven uitzoeken welke kant het op is.
  | { spelerId: null; gastnaam: string; gastnummer: number | null }

/**
 * Wie zich heeft aangemeld. Stond drie keer los uitgeschreven: twee keer
 * hieronder en een keer in het leidersscherm. Die laatste kon stilletjes uit
 * de pas gaan lopen met de rest, want geen enkele test keek mee.
 */
export function bepaalAanwezigen(stand: Stand[]): Set<string> {
  return new Set(stand.filter((s) => s.status === 'ja').map((s) => s.spelerId))
}

/**
 * De bank wordt afgeleid en niet opgeslagen: wie komt en geen veldplek heeft,
 * plus de gasten die op de bank zijn gezet. Zo is er niets dat uit de pas kan
 * lopen als iemand zich alsnog afmeldt.
 */
export function bepaalBank(stand: Stand[], plekken: OpgesteldePlek[]): Bankregel[] {
  const opgesteld = new Set(
    plekken.filter((p) => p.spelerId !== null).map((p) => p.spelerId as string),
  )

  const spelers: Bankregel[] = stand
    .filter((s) => s.status === 'ja' && !opgesteld.has(s.spelerId))
    .map((s) => ({ spelerId: s.spelerId, gastnaam: null, gastnummer: null }))

  const gasten: Bankregel[] = plekken
    .filter((p) => p.slot === null && p.gastnaam !== null)
    .map((p) => ({ spelerId: null, gastnaam: p.gastnaam as string, gastnummer: p.gastnummer }))

  return [...spelers, ...gasten]
}

/**
 * Wie staat opgesteld terwijl hij er niet is? Twee gevallen met één regel:
 * hij heeft zich afgemeld, of hij zit niet meer in de selectie. Gasten komen
 * in de stand niet voor en tellen daarom nooit mee.
 */
export function bepaalWaarschuwingen(stand: Stand[], plekken: OpgesteldePlek[]): string[] {
  const komt = bepaalAanwezigen(stand)

  return plekken
    .filter((p) => p.spelerId !== null && !komt.has(p.spelerId))
    .map((p) => p.spelerId as string)
}

/**
 * Wie het bouwscherm mag aanbieden. Wie dit soort event structureel niet doet
 * valt weg — tenzij hij zich er tóch voor heeft aangemeld, of er al staat.
 *
 * Filters, geen sloten: de standaard bepaalt alleen wie er ongevraagd bij zit,
 * en een melding wint ervan. Wie al opgesteld staat blijft er hoe dan ook bij,
 * want deze lijst levert ook de naam onder zijn vakje op het veld; valt hij
 * eruit, dan staat er een vraagteken op de plek waar hij hoort.
 */
export function kandidatenVoor(
  spelers: { id: string; doetMee: boolean }[],
  stand: Stand[],
  plekken: OpgesteldePlek[],
): string[] {
  const komt = bepaalAanwezigen(stand)
  const opgesteld = new Set(
    plekken.filter((p) => p.spelerId !== null).map((p) => p.spelerId as string),
  )

  return spelers
    .filter((s) => s.doetMee || komt.has(s.id) || opgesteld.has(s.id))
    .map((s) => s.id)
}

/** Eén regel zoals hij op het scherm, op de plaat en in het appje verschijnt. */
export type Weergaveregel = {
  /** Leeg betekent bank. */
  slot: number | null
  spelerId: string | null
  nummer: number | null
  naam: string
  gast: boolean
  gewaarschuwd: boolean
}

export type Basisregel = Weergaveregel & { slot: number }

export type Opstellingweergave = { basis: Basisregel[]; bank: Weergaveregel[] }

/**
 * Van opgeslagen plekken naar leesbare regels. Eén plek waar een spelersplek
 * aan zijn naam en rugnummer wordt gekoppeld en waar de terugval bij een
 * verdwenen speler staat, zodat het spelersscherm, het leidersscherm, het
 * appje en de deelplaat nooit iets anders kunnen tonen.
 *
 * naamVan en nummerVan komen uit álle spelers en niet alleen de actieve: wie
 * op non-actief is gezet terwijl hij opgesteld stond, houdt zijn eigen naam.
 */
export function maakOpstellingWeergave(invoer: {
  stand: Stand[]
  plekken: OpgesteldePlek[]
  naamVan: Map<string, string>
  nummerVan: Map<string, number | null>
}): Opstellingweergave {
  const gewaarschuwd = new Set(bepaalWaarschuwingen(invoer.stand, invoer.plekken))

  const naam = (spelerId: string) => invoer.naamVan.get(spelerId) ?? 'onbekend'
  const nummer = (spelerId: string) => invoer.nummerVan.get(spelerId) ?? null

  const basis: Basisregel[] = invoer.plekken
    .filter((p) => p.slot !== null)
    .sort((a, b) => (a.slot as number) - (b.slot as number))
    .map((p) => ({
      slot: p.slot as number,
      spelerId: p.spelerId,
      nummer: p.spelerId === null ? p.gastnummer : nummer(p.spelerId),
      naam: p.spelerId === null ? (p.gastnaam ?? 'gast') : naam(p.spelerId),
      gast: p.spelerId === null,
      gewaarschuwd: p.spelerId !== null && gewaarschuwd.has(p.spelerId),
    }))

  // De bank is per definitie wie er wél is, dus daar valt niets te waarschuwen.
  const bank: Weergaveregel[] = bepaalBank(invoer.stand, invoer.plekken).map((regel) => ({
    slot: null,
    spelerId: regel.spelerId,
    nummer: regel.spelerId === null ? regel.gastnummer : nummer(regel.spelerId),
    naam: regel.spelerId === null ? regel.gastnaam : naam(regel.spelerId),
    gast: regel.spelerId === null,
    gewaarschuwd: false,
  }))

  return { basis, bank }
}
